
"use client";

import type { Advertisement } from "@/lib/types";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { useEffect, useRef } from "react";

interface AdDisplayProps {
  ad: Advertisement;
  className?: string; // Optional class name for styling the container
}

export default function AdDisplay({ ad, className }: AdDisplayProps) {
  const adContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // This effect attempts to execute scripts within the code snippet
    // This is generally UNSAFE if the snippet is not trusted.
    if (ad.adType === 'external' && ad.codeSnippet && adContainerRef.current) {
      const container = adContainerRef.current;
      // Clear previous content
      container.innerHTML = ad.codeSnippet;
      // Find and execute scripts
      const scripts = Array.from(container.querySelectorAll("script"));
      scripts.forEach(oldScript => {
        const newScript = document.createElement("script");
        // Copy attributes
        Array.from(oldScript.attributes).forEach(attr => {
          newScript.setAttribute(attr.name, attr.value);
        });
        // Copy content
        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
        // Replace old script with new one to trigger execution
        oldScript.parentNode?.replaceChild(newScript, oldScript);
      });
    }
  }, [ad.adType, ad.codeSnippet]); // Rerun if type or snippet changes


  if (!ad || !ad.isActive) {
    return null;
  }

  // Render custom image ad
  if (ad.adType === 'custom' && ad.imageUrl && ad.linkUrl) {
    return (
      <Card className={`my-4 overflow-hidden shadow-md rounded-lg ${className}`}>
        <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer nofollow" aria-label={ad.altText || "Advertisement"}>
          <div className="relative w-full aspect-[4/1] md:aspect-[5/1]"> {/* Adjust aspect ratio */}
            <Image
              src={ad.imageUrl}
              alt={ad.altText || "Advertisement"}
              fill
              style={{ objectFit: 'cover' }}
              priority // Consider making conditional based on placement
              data-ai-hint="advertisement banner"
            />
          </div>
        </a>
      </Card>
    );
  }

  // Render external code snippet ad
  if (ad.adType === 'external' && ad.codeSnippet) {
    return (
      <div 
        ref={adContainerRef}
        className={`my-4 ad-external-snippet ${className}`} 
        // dangerouslySetInnerHTML={{ __html: ad.codeSnippet }} // Avoid direct use if possible, use useEffect approach
      />
      // The useEffect hook will populate this div
    );
  }

  // Fallback if ad type is unknown or data is missing
  return null;
}
