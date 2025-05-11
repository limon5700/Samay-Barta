
"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import Link from "next/link";
import { useState, type ChangeEvent, type FormEvent } from "react";

interface HeaderProps {
  appName: string;
  onSearch: (searchTerm: string) => void;
}

export default function Header({ appName, onSearch }: HeaderProps) {
  const [inputValue, setInputValue] = useState("");

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(inputValue);
  };

  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center">
        <Link href="/" className="text-3xl font-bold text-primary hover:opacity-80 transition-opacity mb-4 sm:mb-0">
          {appName}
        </Link>
        <form onSubmit={handleSubmit} className="w-full sm:w-auto max-w-md sm:max-w-xs">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search news..."
              value={inputValue}
              onChange={handleInputChange}
              className="pl-10 pr-4 py-2 w-full rounded-md border bg-input text-foreground focus:ring-primary focus:border-primary transition-colors"
              aria-label="Search news articles"
            />
          </div>
        </form>
      </div>
    </header>
  );
}
