
"use client";

import type { Gadget } from "@/lib/types"; // Use Gadget type
import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card"; // Keep Card for potential container styling

interface AdDisplayProps {
  gadget: Gadget; // Use Gadget type
  className?: string; // Optional class name for styling the container
}

export default function AdDisplay({ gadget, className }: AdDisplayProps) {
  const adContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // This effect executes scripts within the gadget content
    // This is generally UNSAFE if the content is not trusted.
    if (gadget.content && adContainerRef.current) {
      const container = adContainerRef.current;
      // Clear previous content before inserting new
      container.innerHTML = '';

      // Create a temporary container to parse the HTML string
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = gadget.content; // Assign the gadget's HTML/JS content

      // Find all script tags within the parsed content
      const scripts = Array.from(tempDiv.querySelectorAll("script"));

      // Append all nodes (including non-script elements) from tempDiv to the actual container
      while (tempDiv.firstChild) {
        container.appendChild(tempDiv.firstChild);
      }


      // Find the scripts *within the actual container* now and execute them
      const scriptsInContainer = Array.from(container.querySelectorAll("script"));
      scriptsInContainer.forEach(oldScript => {
        const newScript = document.createElement("script");
        // Copy attributes (like src, async, defer)
        Array.from(oldScript.attributes).forEach(attr => {
          newScript.setAttribute(attr.name, attr.value);
        });
        // Copy inline script content
        if (oldScript.textContent) {
            newScript.appendChild(document.createTextNode(oldScript.textContent));
        }

        // Replace the old script tag with the new one to trigger execution
         if (oldScript.parentNode) {
            oldScript.parentNode.replaceChild(newScript, oldScript);
         } else {
            console.warn("Script's parentNode is null, cannot replace to execute:", oldScript);
         }
      });
    }
     // Cleanup function to remove content when component unmounts or gadget changes
     return () => {
        if (adContainerRef.current) {
            adContainerRef.current.innerHTML = '';
        }
     };
  }, [gadget.content, gadget.id]); // Rerun effect if gadget content or ID changes


  if (!gadget || !gadget.isActive || !gadget.content) {
    return null; // Don't render anything if gadget is inactive or has no content
  }

  // Render the container div. The useEffect hook will populate this div.
  return (
    <div
      ref={adContainerRef}
      className={`gadget-container section-${gadget.section} ${className}`}
      data-gadget-id={gadget.id}
      // Avoid dangerouslySetInnerHTML for script execution; handled by useEffect
    />
  );
}
