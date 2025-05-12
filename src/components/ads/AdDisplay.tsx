
"use client";

import type { Advertisement } from "@/lib/types";
import Image from "next/image";
import { Card } from "@/components/ui/card";

interface AdDisplayProps {
  ad: Advertisement;
}

export default function AdDisplay({ ad }: AdDisplayProps) {
  if (!ad || !ad.isActive) {
    return null;
  }

  return (
    <Card className="my-6 overflow-hidden shadow-md rounded-lg">
      <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" aria-label={ad.altText || "Advertisement"}>
        <div className="relative w-full aspect-[3/1] sm:aspect-[4/1] md:aspect-[5/1]"> {/* Adjust aspect ratio as needed */}
          <Image
            src={ad.imageUrl}
            alt={ad.altText || "Advertisement"}
            fill
            style={{ objectFit: 'cover' }}
            priority // Mark as priority if it's above the fold
            data-ai-hint="advertisement banner"
          />
        </div>
      </a>
    </Card>
  );
}
