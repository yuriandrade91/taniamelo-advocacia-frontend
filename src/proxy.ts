
import { NextRequest, NextResponse } from "next/server";
import { publicRoutes, privateRoutes } from "./constants/paths/routes";

export default function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const token = request.cookies.get("token")?.value;

	if (pathname === publicRoutes.login) {
		// Usuário já autenticado não deve ver a tela de login.
		if (token) {
			return NextResponse.redirect(new URL(privateRoutes.home, request.url));
		}
		return NextResponse.next();
	}

	if (!token) {
		return NextResponse.redirect(new URL(publicRoutes.login, request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		"/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)",
	],
};
