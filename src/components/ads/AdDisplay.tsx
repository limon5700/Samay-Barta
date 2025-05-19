
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
    // This effect executes scripts within the gadget content.
    // Be aware that arbitrary HTML/JS from gadgets can attempt to use browser APIs.
    // If a gadget tries to perform a restricted action (like writing to the clipboard
    // without user permission or proper document policies), the browser will block it
    // and may log errors to the console (e.g., Clipboard API errors, CORS errors
    // if the gadget tries to fetch external resources without proper headers).
    // Such errors originate from the gadget's content, not AdDisplay.tsx itself.
    if (gadget.content && adContainerRef.current) {
      const container = adContainerRef.current;
      // Clear previous content before inserting new
      container.innerHTML = '';

      // Create a temporary container to parse the HTML string
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = gadget.content; // Assign the gadget's HTML/JS content

      // Append all nodes (including non-script elements) from tempDiv to the actual container
      // This ensures HTML structure is rendered.
      while (tempDiv.firstChild) {
        container.appendChild(tempDiv.firstChild);
      }

      // Find the scripts *within the actual container* now and execute them
      // This is necessary because scripts inserted via innerHTML might not execute automatically or correctly.
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
            // This case should ideally not happen if scripts are correctly appended within the container.
            // console.warn("Script's parentNode is null, cannot replace to execute:", oldScript);
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
      className={`gadget-container section-${gadget.section || 'unknown'} ${className || ''}`}
      data-gadget-id={gadget.id}
      // Avoid dangerouslySetInnerHTML for script execution; handled by useEffect
    />
  );
}

    