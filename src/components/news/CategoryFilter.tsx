
"use client";

import type { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Cpu, Trophy, Briefcase, Globe2, Film, List } from "lucide-react"; // Added List for 'All'

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: Category | "All";
  onSelectCategory: (category: Category | "All") => void;
}

const categoryIcons: Record<Category | "All", React.ElementType> = {
  All: List,
  Technology: Cpu,
  Sports: Trophy,
  Business: Briefcase,
  World: Globe2,
  Entertainment: Film,
};

export default function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  const allDisplayCategories: (Category | "All")[] = ["All", ...categories];

  return (
    <div className="mb-8 flex flex-wrap gap-2 justify-center">
      {allDisplayCategories.map((category) => {
        const Icon = categoryIcons[category] || List; // Default icon if not found
        return (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            onClick={() => onSelectCategory(category)}
            className={cn(
              "transition-all duration-200 ease-in-out transform hover:scale-105",
              selectedCategory === category && "shadow-lg"
            )}
            aria-pressed={selectedCategory === category}
          >
            <Icon className="mr-2 h-4 w-4" />
            {category}
          </Button>
        );
      })}
    </div>
  );
}
