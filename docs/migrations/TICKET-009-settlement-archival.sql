-- =============================================================================
-- TICKET-009: 만료 정산형 박제 (24시간 만료 시점 정산)
--
-- 적용: Supabase SQL Editor 또는 psql에서 실행
-- 의존: confessions, app_settings(glass_threshold), opted_out, toggle_candle (TICKET-007/008)
-- 제품: 살아있는 동안 촛불은 자유롭게 오르내리고, 만료 순간의 촛불 수로만 박제 판정.
-- =============================================================================

-- 선택 컬럼: 박제 시각 기록 (없으면 추가)
ALTER TABLE public.confessions
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

COMMENT ON COLUMN public.confessions.archived_at IS
  '만료 정산으로 스테인드글라스에 박제된 시각. 기존 박제 조각은 NULL일 수 있음.';

-- 1) toggle_candle: 즉시 박제 판정 제거 — 투표/카운트만. isArchived는 저장값 그대로.
CREATE OR REPLACE FUNCTION public.toggle_candle(
  confession_id text,
  user_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candles integer;
  v_voters text[];
  v_is_archived boolean;
  v_voted boolean;
BEGIN
  SELECT
    c.candles,
    COALESCE(c.candle_voters, ARRAY[]::text[]),
    COALESCE(c.is_archived, false)
  INTO
    v_candles,
    v_voters,
    v_is_archived
  FROM public.confessions AS c
  WHERE c.id::text = confession_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'candles', 0,
      'isArchived', false,
      'voted', false
    );
  END IF;

  IF user_id = ANY (v_voters) THEN
    -- 소등: 투표 제거 + 촛불 -1 (0 미만 방지). 박제 여부는 변경하지 않음.
    v_voters := array_remove(v_voters, user_id);
    v_candles := GREATEST(0, v_candles - 1);
    v_voted := false;
  ELSE
    -- 점화: 투표 추가 + 촛불 +1. 즉시 박제하지 않음(만료 정산).
    v_voters := array_append(v_voters, user_id);
    v_candles := v_candles + 1;
    v_voted := true;
  END IF;

  UPDATE public.confessions
  SET
    candles = v_candles,
    candle_voters = v_voters
  WHERE id::text = confession_id;

  RETURN json_build_object(
    'success', true,
    'candles', v_candles,
    'isArchived', v_is_archived,
    'voted', v_voted
  );
END;
$$;

COMMENT ON FUNCTION public.toggle_candle(text, text) IS
  '촛불 토글(켜기/끄기). 박제 판정은 하지 않음 — settle_expired_confessions가 만료 시점에 정산.';

-- 2) 만료 정산: 임계값 이상 → 박제, 미만(및 옵트아웃) → 하드 삭제
CREATE OR REPLACE FUNCTION public.settle_expired_confessions()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_threshold integer;
  v_archived integer := 0;
  v_deleted integer := 0;
BEGIN
  SELECT
    CASE
      WHEN s.value IS NULL THEN NULL
      WHEN jsonb_typeof(s.value) = 'number' THEN trunc((s.value #>> '{}')::numeric)::integer
      WHEN jsonb_typeof(s.value) = 'string' THEN NULLIF(trim(s.value #>> '{}'), '')::integer
      ELSE NULL
    END
  INTO v_threshold
  FROM public.app_settings AS s
  WHERE s.key = 'glass_threshold';

  IF v_threshold IS NULL OR v_threshold <= 0 THEN
    v_threshold := 5;
  END IF;

  -- (a) 만료 + 미박제 + 비옵트아웃 + 임계값 이상 → 박제 (이미 박제된 조각은 조건에서 제외)
  UPDATE public.confessions
  SET
    is_archived = true,
    archived_at = COALESCE(archived_at, now())
  WHERE expires_at <= now()
    AND is_archived = false
    AND COALESCE(opted_out, false) = false
    AND candles >= v_threshold;

  GET DIAGNOSTICS v_archived = ROW_COUNT;

  -- (b) 만료 + 아직 미박제 잔여(임계값 미만·옵트아웃 포함) → 하드 삭제
  DELETE FROM public.confessions
  WHERE expires_at <= now()
    AND is_archived = false;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'archived', v_archived,
    'deleted', v_deleted,
    'processed', v_archived + v_deleted
  );
END;
$$;

COMMENT ON FUNCTION public.settle_expired_confessions() IS
  '만료 고해 정산. candles>=glass_threshold(폴백 5)이면 박제, 아니면 삭제. 기존 is_archived=true 조각은 불변.';
