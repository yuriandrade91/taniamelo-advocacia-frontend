
import { NextRequest, NextResponse } from "next/server";
import { publicRoutes } from "./constants/paths/routes";

export default function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	if (pathname === publicRoutes.login) {
		return NextResponse.next();
	}

	// const token = request.cookies.get("token");

	// if (!token) {
	//   return NextResponse.redirect(new URL(`${publicRoutes.login}", request.url));
	// }

	return NextResponse.next();
}

export const config = {
	matcher: [
		"/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)",
	],
};
