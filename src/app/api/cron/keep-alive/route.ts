import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  
  // Vercel Cron은 자동으로 헤더에 'Bearer CRON_SECRET'을 실어 보냅니다.
  // 로컬 개발 환경(CRON_SECRET이 없을 때)에서는 호출을 테스트하기 위해 검증을 건너뛰게 처리합니다.
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Supabase DB를 찔러서 활성 상태를 유지 (visitor_counter 테이블의 단일 레코드 SELECT)
    const { data, error } = await supabase
      .from('visitor_counter')
      .select('count')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Supabase keep-alive failed with DB error:', error);
      return NextResponse.json(
        { success: false, error: error.message }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase DB keep-alive ping successful',
      timestamp: new Date().toISOString(),
      counter: data?.count || 0
    });

  } catch (err: any) {
    console.error('Supabase keep-alive failed with unexpected error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}
