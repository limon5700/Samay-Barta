
"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import Link from "next/link";
import { useState, type ChangeEvent, type FormEvent, useEffect } from "react";
import ThemeLanguageSwitcher from "./ThemeLanguageSwitcher";
import { useAppContext } from "@/context/AppContext";

interface HeaderProps {
  onSearch: (searchTerm: string) => void;
}

export default function Header({ onSearch }: HeaderProps) {
  const [inputValue, setInputValue] = useState("");
  const { getUIText, isClient } = useAppContext();
  const [appName, setAppName] = useState('');
  const [searchPlaceholder, setSearchPlaceholder] = useState('');

  useEffect(() => {
    if (isClient) {
      setAppName(getUIText('appName'));
      setSearchPlaceholder(getUIText('searchPlaceholder'));
    }
  }, [isClient, getUIText]);


  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(inputValue);
  };

  if (!isClient) {
    // Basic skeleton or minimal content for SSR to prevent hydration errors with dynamic text
    return (
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center">
          <div className="text-3xl font-bold text-primary mb-4 sm:mb-0 animate-pulse bg-muted-foreground/20 h-9 w-48 rounded-md"></div>
          <div className="w-full sm:w-auto max-w-md sm:max-w-xs relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
             <Input type="search" className="pl-10 pr-4 py-2 w-full rounded-md border bg-input text-foreground" disabled />
          </div>
          <div className="w-10 h-10" />
        </div>
      </header>
    );
  }


  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center">
        <Link href="/" className="text-3xl font-bold text-primary hover:opacity-80 transition-opacity mb-4 sm:mb-0">
          {appName}
        </Link>
        <div className="flex items-center gap-2">
          <form onSubmit={handleSubmit} className="w-full sm:w-auto max-w-md sm:max-w-xs">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder={searchPlaceholder}
                value={inputValue}
                onChange={handleInputChange}
                className="pl-10 pr-4 py-2 w-full rounded-md border bg-input text-foreground focus:ring-primary focus:border-primary transition-colors"
                aria-label={searchPlaceholder}
              />
            </div>
          </form>
          <ThemeLanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
