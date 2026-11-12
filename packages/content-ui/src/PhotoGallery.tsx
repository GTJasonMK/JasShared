"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Photo } from "@jas/content-core";
import { useContentHost } from "./ContentHost";

function PhotoImage({ photo, full = false, priority = false }: { photo: Photo; full?: boolean; priority?: boolean }) {
  const host = useContentHost();
  const Image = host.Image ?? "img";
  const assetUrl = host.assetUrl ?? ((src: string) => src);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(!full);
  if (failed) return <p role="alert" className="photography-image-error">图片加载失败</p>;
  const largest = photo.images[photo.images.length - 1];
  const sourceSet = photo.images.map((image) => `${assetUrl(image.src)} ${image.width}w`).join(", ");
  const sizes = "(max-width: 639px) calc(100vw - 3rem), (max-width: 1023px) calc((100vw - 6rem) / 2), calc((min(100vw, 76rem) - 8rem) / 3)";
  const image = <Image src={assetUrl(full ? largest.src : photo.images[0].src)} alt={photo.alt}
    width={largest.width} height={largest.height}
    fetchPriority={priority ? "high" : undefined}
    style={full && !loaded ? { opacity: 0 } : undefined}
    onLoad={() => { if (full) setLoaded(true); }}
    loading={priority ? "eager" : "lazy"} onError={() => setFailed(true)}
    className={full ? "photography-full-image" : "photography-thumbnail"} />;
  return full ? <>{!loaded && <p role="status" className="photography-loading">照片加载中…</p>}{image}</> : <>
    {priority && <link rel="preload" as="image" href={assetUrl(photo.images[0].src)} imageSrcSet={sourceSet} imageSizes={sizes} fetchPriority="high" />}
    <picture>
    <source srcSet={sourceSet} sizes={sizes} />
    {image}
    </picture>
  </>;
}

function PhotoViewer({ photo, index, count, onMove, onClose, trigger }: {
  photo: Photo; index: number; count: number; onMove: (offset: number) => void; onClose: () => void; trigger: HTMLElement | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const active = document.activeElement;
    if (active === document.body || (active instanceof HTMLButtonElement && active.disabled)) {
      const target = index === count - 1 && index > 0 ? previousRef.current : count > 1 ? nextRef.current : closeRef.current;
      target?.focus({ preventScroll: true });
    }
  }, [index, count]);
  useEffect(() => {
    const dialog = dialogRef.current!;
    const overflow = document.documentElement.style.overflow;
    const padding = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbarWidth}px`;
    document.documentElement.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.documentElement.style.overflow = overflow;
      document.body.style.paddingRight = padding;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [trigger]);
  return <dialog ref={dialogRef} className="photography-viewer" aria-labelledby="photo-viewer-title"
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onKeyDown={(event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        onMove(event.key === "ArrowLeft" ? -1 : 1);
      }
    }}>
    <div className="photography-viewer-body">
      <header className="photography-viewer-toolbar">
        <p aria-live="polite" className="photography-counter">{String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}</p>
        <button ref={closeRef} type="button" className="photography-icon-button" aria-label="关闭大图" onClick={onClose}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </header>
      <div className="photography-viewer-stage"><PhotoImage key={photo.id} photo={photo} full priority /></div>
      <footer className="photography-viewer-caption">
        <div>
          <h2 id="photo-viewer-title">{photo.title}</h2>
          <p className="photography-viewer-meta">
            {photo.category && <span>{photo.category}</span>}
            {photo.location && <span>{photo.location}</span>}
            {photo.takenAt && <time dateTime={photo.takenAt}>{photo.takenAt.replace(/-/g, ".")}</time>}
            {photo.camera && <span>{photo.camera}</span>}
          </p>
        </div>
        <div className="photography-viewer-controls" role="group" aria-label="浏览作品">
          <button ref={previousRef} type="button" className="photography-icon-button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="上一张">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5-7 7 7 7" /></svg>
          </button>
          <button ref={nextRef} type="button" className="photography-icon-button" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="下一张">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 5 7 7-7 7" /></svg>
          </button>
        </div>
      </footer>
    </div>
  </dialog>;
}

export default function PhotoGallery({ photos }: { photos: Photo[] }) {
  const host = useContentHost();
  const [category, setCategory] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const categories = [...new Set(photos.flatMap((photo) => photo.category ? [photo.category] : []))];
  const visible = category === null ? photos : photos.filter((photo) => photo.category === category);
  const selected = activeIndex === null ? null : visible[activeIndex];

  if (!photos.length) return <section className="photography-empty" aria-labelledby="photography-empty-title">
    <svg viewBox="0 0 160 112" aria-hidden="true"><path d="M1 1h158v110H1zM1 88l45-39 38 32 23-20 52 42" /><circle cx="116" cy="31" r="9" /></svg>
    <h2 id="photography-empty-title">作品整理中</h2>
    <p>摄影作品将陆续更新。</p>
  </section>;

  return <>
    <h2 className="sr-only">摄影作品列表</h2>
    <div className="photography-gallery-toolbar">
      {categories.length > 1 ? <div className="photography-filters" role="group" aria-label="按分类浏览作品">
        {[null, ...categories].map((item) => <button key={item === null ? "all" : `category:${item}`} type="button" aria-pressed={category === item}
          onClick={() => { setCategory(item); setActiveIndex(null); }}>
          {item ?? "全部作品"}
        </button>)}
      </div> : <p className="photography-gallery-label">全部作品</p>}
      <p role="status" className="photography-visible-count">{visible.length} 张</p>
    </div>
    <ul className="photography-grid" aria-label={category === null ? "全部摄影作品" : `${category}摄影作品`}>
      {visible.map((photo, index) => {
        const largest = photo.images[photo.images.length - 1];
        return <li key={photo.id}>
        <figure>
          <a href={host.assetUrl?.(largest.src) ?? largest.src} className="photography-photo-button" style={{ aspectRatio: `${largest.width} / ${largest.height}` }} aria-label={`查看作品：${photo.title}`} aria-haspopup="dialog"
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault(); triggerRef.current = event.currentTarget; setActiveIndex(index);
            }}>
            <PhotoImage photo={photo} priority={index === 0} />
            <span className="photography-expand" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5" /></svg></span>
          </a>
          <figcaption><h3>{photo.title}</h3><p>{[photo.location, photo.takenAt?.slice(0, 4)].filter(Boolean).join(" / ")}</p></figcaption>
        </figure>
      </li>; })}
    </ul>
    {selected && activeIndex !== null && <PhotoViewer photo={selected} index={activeIndex} count={visible.length} trigger={triggerRef.current}
      onClose={() => setActiveIndex(null)} onMove={(offset) => setActiveIndex((index) => Math.max(0, Math.min(visible.length - 1, (index ?? 0) + offset)))} />}
  </>;
}
