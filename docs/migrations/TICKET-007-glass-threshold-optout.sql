-- =============================================================================
-- TICKET-007: 박제 임계값(app_settings) + 작성자 옵트아웃(opted_out)
--
-- 적용: Supabase SQL Editor 또는 psql에서 실행
-- 의존: confessions 테이블, 기존 increment_candle RPC
-- =============================================================================

-- 1) 서버 설정 테이블
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 시드: 박제 임계값 100 (FR-4.1 / FR-4.5)
INSERT INTO public.app_settings (key, value)
VALUES ('glass_threshold', '100'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2) 작성자 옵트아웃 컬럼
ALTER TABLE public.confessions
  ADD COLUMN IF NOT EXISTS opted_out boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.confessions.opted_out IS
  '작성자가 스테인드글라스 박제를 거부한 경우 true. 박제 판정에서 제외되며, 해제 시 expires_at을 현재로 두어 정리 주기에 소멸.';

-- 3) increment_candle: 임계값은 app_settings 조회(없으면 100), opted_out이면 박제 제외
CREATE OR REPLACE FUNCTION public.increment_candle(
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
      'isArchived', false
    );
  END IF;

  -- 이미 투표한 사용자
  IF user_id = ANY (v_voters) THEN
    RETURN json_build_object(
      'success', false,
      'candles', v_candles,
      'isArchived', v_is_archived
    );
  END IF;

  -- app_settings.glass_threshold (jsonb number|string). 없거나 비정상이면 100
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
    v_threshold := 100;
  END IF;

  v_voters := array_append(v_voters, user_id);
  v_candles := v_candles + 1;

  -- 옵트아웃 글은 임계값 도달해도 박제하지 않음
  IF NOT v_opted_out AND v_candles >= v_threshold THEN
    v_is_archived := true;
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
    'isArchived', v_is_archived
  );
END;
$$;

COMMENT ON FUNCTION public.increment_candle(text, text) IS
  '촛불 +1 (1인 1회). 박제 임계값은 app_settings.glass_threshold(폴백 100). opted_out=true면 박제 제외.';
