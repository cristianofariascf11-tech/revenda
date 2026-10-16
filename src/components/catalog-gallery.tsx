"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, ImageOff, X } from "lucide-react";
import { useEffect, useState } from "react";

type CatalogPhoto = {
  id: string;
  url: string;
};

type Props = {
  photos: CatalogPhoto[];
  vehicleName: string;
};

export function CatalogGallery({ photos, vehicleName }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const photo = photos[selectedIndex];
  const hasNavigation = photos.length > 1;

  function showPrevious() {
    setSelectedIndex(current => (current - 1 + photos.length) % photos.length);
  }

  function showNext() {
    setSelectedIndex(current => (current + 1) % photos.length);
  }

  useEffect(() => {
    if (!expanded) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
      if (event.key === "ArrowLeft" && hasNavigation) {
        setSelectedIndex(current => (current - 1 + photos.length) % photos.length);
      }
      if (event.key === "ArrowRight" && hasNavigation) {
        setSelectedIndex(current => (current + 1) % photos.length);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [expanded, hasNavigation, photos.length]);

  if (!photo) {
    return <div className="catalog-gallery">
      <div className="catalog-gallery-main">
        <span className="catalog-photo-empty"><ImageOff size={42} />Foto em preparação</span>
      </div>
    </div>;
  }

  const imageAlt = `${vehicleName} — foto ${selectedIndex + 1} de ${photos.length}`;

  return <>
    <section className="catalog-gallery" aria-label={`Álbum de fotos da ${vehicleName}`}>
      <div className="catalog-gallery-main">
        <button
          type="button"
          className="catalog-gallery-expand"
          onClick={() => setExpanded(true)}
          aria-label={`Ampliar ${imageAlt}`}
        >
          <Image src={photo.url} alt={imageAlt} fill priority sizes="(max-width: 900px) 100vw, 65vw" />
          <span className="catalog-gallery-expand-label"><Expand size={17} />Ampliar foto</span>
        </button>

        {hasNavigation && <>
          <button type="button" className="catalog-gallery-arrow catalog-gallery-arrow-left" onClick={showPrevious} aria-label="Foto anterior"><ChevronLeft size={25} /></button>
          <button type="button" className="catalog-gallery-arrow catalog-gallery-arrow-right" onClick={showNext} aria-label="Próxima foto"><ChevronRight size={25} /></button>
        </>}
        <span className="catalog-gallery-counter" aria-live="polite">{selectedIndex + 1} / {photos.length}</span>
      </div>

      {hasNavigation && <div className="catalog-gallery-thumbs" aria-label="Escolha uma foto">
        {photos.map((item, index) => <button
          type="button"
          className={`catalog-gallery-thumb${index === selectedIndex ? " is-active" : ""}`}
          key={item.id}
          onClick={() => setSelectedIndex(index)}
          aria-label={`Mostrar foto ${index + 1}`}
          aria-pressed={index === selectedIndex}
        >
          <Image src={item.url} alt="" fill sizes="110px" />
          <span>{index + 1}</span>
        </button>)}
      </div>}
    </section>

    {expanded && <div className="catalog-lightbox" role="dialog" aria-modal="true" aria-label={`Foto ampliada da ${vehicleName}`} onMouseDown={event => {
      if (event.target === event.currentTarget) setExpanded(false);
    }}>
      <button type="button" className="catalog-lightbox-close" onClick={() => setExpanded(false)} aria-label="Fechar foto ampliada"><X size={25} /></button>
      <div className="catalog-lightbox-image">
        <Image src={photo.url} alt={imageAlt} fill priority sizes="100vw" />
      </div>
      {hasNavigation && <>
        <button type="button" className="catalog-lightbox-arrow catalog-lightbox-arrow-left" onClick={showPrevious} aria-label="Foto anterior"><ChevronLeft size={32} /></button>
        <button type="button" className="catalog-lightbox-arrow catalog-lightbox-arrow-right" onClick={showNext} aria-label="Próxima foto"><ChevronRight size={32} /></button>
      </>}
      <span className="catalog-lightbox-counter">{selectedIndex + 1} de {photos.length}</span>
    </div>}
  </>;
}