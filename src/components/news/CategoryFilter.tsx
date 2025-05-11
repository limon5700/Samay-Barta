
"use client";

import type { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Cpu, Trophy, Briefcase, Globe2, Film, List } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { useEffect, useState } from "react";

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

// Mapping from original category names to uiTexts keys
const categoryUiTextKeys: Record<string, string> = {
  All: "allCategories",
  Technology: "technologyCategory",
  Sports: "sportsCategory",
  Business: "businessCategory",
  World: "worldCategory",
  Entertainment: "entertainmentCategory",
};

export default function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  const { getUIText, isClient } = useAppContext();
  const [displayCategories, setDisplayCategories] = useState<(Category | "All")[]>([]);

  useEffect(() => {
    const safePropCategories = Array.isArray(categories) ? categories : [];
    if (isClient) {
      setDisplayCategories(["All", ...safePropCategories]);
    } else {
      // Fallback for SSR or when isClient is false initially
      setDisplayCategories(["All", ...safePropCategories]);
    }
  }, [isClient, categories]);


  if (!isClient) {
    // Render a placeholder or basic version for SSR if categories are not ready
    // This helps prevent hydration errors if getUIText is not fully ready on initial server render
    const safeCategoriesForSsr = Array.isArray(categories) ? categories : [];
    return (
      <div className="mb-8 flex flex-wrap gap-2 justify-center">
        {(["All", ...safeCategoriesForSsr]).map((category) => (
          <Button key={category} variant="outline" disabled>
            {category} {/* Show raw category name for SSR placeholder */}
          </Button>
        ))}
      </div>
    );
  }


  return (
    <div className="mb-8 flex flex-wrap gap-2 justify-center">
      {displayCategories.map((category) => {
        const Icon = categoryIcons[category as Category] || List;
        const uiTextKey = categoryUiTextKeys[category as string] || category as string;
        const translatedCategoryName = getUIText(uiTextKey);
        
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
            {translatedCategoryName}
          </Button>
        );
      })}
    </div>
  );
}

