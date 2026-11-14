import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import Header from "@/components/Header";
import StickyCartBar from "@/components/StickyCartBar";
import CustomerFooter from "@/components/CustomerFooter";
import XanhSmFloatingButton from "@/components/XanhSmFloatingButton";

export const metadata: Metadata = {
  title: "Cà Xòi • Trạm Cấp Cứu Cơn Buồn Ngủ Công Sở | Đà Nẵng",
  description: "Cà Xòi: Tỉnh như sáo, báo như Xòi! Trạm cấp cứu cơn buồn ngủ công sở, giao siêu tốc Hải Châu, Thanh Khê, Ngũ Hành Sơn, Đà Nẵng. Hotline: 0905 249 733.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var isExtErr = function(err, fn) {
                  var str = (fn || "") + " " + ((err && err.stack) || "") + " " + ((err && err.message) || "");
                  return str.indexOf("chrome-extension://") !== -1 ||
                         str.indexOf("moz-extension://") !== -1 ||
                         str.indexOf("onMessage") !== -1 ||
                         str.indexOf("Extension context invalidated") !== -1;
                };
                window.addEventListener("error", function(e) {
                  if (isExtErr(e.error, e.filename)) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                }, true);
                window.addEventListener("unhandledrejection", function(e) {
                  if (isExtErr(e.reason, "")) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                }, true);
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-cream flex flex-col antialiased selection:bg-caramel/20 selection:text-coffee-900">
        <CartProvider>
          <Header />
          <main className="flex-1 pb-20">{children}</main>
          <StickyCartBar />
          <XanhSmFloatingButton />
          <CustomerFooter />
        </CartProvider>
      </body>
    </html>
  );
}
