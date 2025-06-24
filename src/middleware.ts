import { NextRequest, NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function middleware(_request: NextRequest) {
  // Отключаем middleware для работы главной страницы
  return NextResponse.next();
  
  // const host = request.headers.get('host') || '';
  // const subdomain = host.split('.')[0];
  // const url = request.nextUrl.clone();

  // // Если зашли на корень поддомена (/) — перенаправляем на нужную страницу
  // if (url.pathname === '/') {
  //   url.pathname = `/page/${subdomain}`;
  //   return NextResponse.rewrite(url); // это именно подмена маршрута
  // }

  // return NextResponse.next();
}

export const config = {
  matcher: ['/', '/page/:path*'], // применяем middleware к корню и /pages/*
};