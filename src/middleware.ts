import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const subdomain = host.split('.')[0];
  const url = request.nextUrl.clone();

  // Если зашли на корень поддомена (/) — перенаправляем на нужную страницу
  if (url.pathname === '/') {
    url.pathname = `/page/${subdomain}`;
    return NextResponse.rewrite(url); // это именно подмена маршрута
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/page/:path*'], // применяем middleware к корню и /pages/*
};