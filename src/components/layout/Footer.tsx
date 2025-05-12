
"use client";

import { useAppContext } from "@/context/AppContext";
import { useEffect, useState } from "react";

export default function Footer() {
  const { getUIText, isClient } = useAppContext();
  const [year, setYear] = useState(new Date().getFullYear());
  const [footerText, setFooterText] = useState({
    reserved: "",
    poweredBy: "",
    appName: ""
  });

  useEffect(() => {
    setYear(new Date().getFullYear()); // Ensure year is current on client
    if (isClient) {
      setFooterText({
        reserved: getUIText("footerReserved"),
        poweredBy: getUIText("footerPoweredBy"),
        appName: getUIText("appName")
      });
    } else {
      // SSR Fallback
       setFooterText({
        reserved: "All rights reserved.",
        poweredBy: "Powered by Samay Barta Lite",
        appName: "Samay Barta Lite"
      });
    }
  }, [isClient, getUIText]);


  return (
    <footer className="bg-card border-t border-border py-6 text-center">
      <div className="container mx-auto px-4">
        <p className="text-sm text-muted-foreground">
          &copy; {year} {footerText.appName}. {footerText.reserved}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {footerText.poweredBy}
        </p>
      </div>
    </footer>
  );
}
