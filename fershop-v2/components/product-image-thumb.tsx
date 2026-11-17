"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";

interface ProductImageThumbProps {
  name: string;
  imageUrl?: string;
}

export function ProductImageThumb({ name, imageUrl }: ProductImageThumbProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  if (!imageUrl) {
    return <span className="ops-product-thumb">{name.slice(0, 2).toUpperCase()}</span>;
  }

  function openPreview(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsOpen(true);
  }

  return (
    <>
      <button
        type="button"
        className="ops-product-thumb ops-product-thumb--clickable"
        aria-label={`Ampliar imagen de ${name}`}
        title="Ampliar imagen"
        onClick={openPreview}
      >
        <img src={imageUrl} alt="" />
      </button>
      {isOpen
        ? createPortal(
            <div
              className="product-image-lightbox"
              role="presentation"
              onMouseDown={(event) => {
                event.stopPropagation();
                if (event.target === event.currentTarget) {
                  setIsOpen(false);
                }
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <section
                className="product-image-lightbox__dialog"
                role="dialog"
                aria-modal="true"
                aria-label={`Imagen ampliada de ${name}`}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                <header>
                  <strong>{name}</strong>
                  <button
                    type="button"
                    autoFocus
                    aria-label="Cerrar imagen ampliada"
                    onClick={() => setIsOpen(false)}
                  >
                    &times;
                  </button>
                </header>
                <div className="product-image-lightbox__canvas">
                  <img src={imageUrl} alt={name} />
                </div>
              </section>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
