-- =============================================================================
-- TICKET-008: 촛불 토글 RPC (켜기/끄기)
--
-- 적용: Supabase SQL Editor 또는 psql에서 실행
-- 의존: confessions, app_settings(glass_threshold), opted_out (TICKET-007)
-- 참고: 기존 increment_candle은 구버전 호환을 위해 유지한다.
-- =============================================================================

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
  v_opted_out boolean;
  v_is_archived boolean;
  v_threshold integer;
  v_voted boolean;
BEGIN
  SELECT
    c.candles,
    COALESCE(c.candle_voters, ARRAY[]::text[]),
    COALESCE(c.opted_out, false),
    COALESCE(c.is_archived, false)
  INTO
    v_candles,
    v_voters,
    v_opted_out,
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

  -- app_settings.glass_threshold (jsonb number|string). 없거나 비정상이면 5
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

  IF user_id = ANY (v_voters) THEN
    -- 소등: 투표 제거 + 촛불 -1 (0 미만 방지). 이미 박제된 글은 유지.
    v_voters := array_remove(v_voters, user_id);
    v_candles := GREATEST(0, v_candles - 1);
    v_voted := false;
  ELSE
    -- 점화: 투표 추가 + 촛불 +1. 임계값 도달 시 박제(opted_out 제외).
    v_voters := array_append(v_voters, user_id);
    v_candles := v_candles + 1;
    v_voted := true;

    IF NOT v_opted_out AND v_candles >= v_threshold THEN
      v_is_archived := true;
    END IF;
  END IF;

  UPDATE public.confessions
  SET
    candles = v_candles,
    candle_voters = v_voters,
    is_archived = v_is_archived
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
  '촛불 토글(켜기/끄기). 박제 임계값은 app_settings.glass_threshold(폴백 5). opted_out=true면 신규 박제 제외. 소등 시 기존 박제는 유지.';
