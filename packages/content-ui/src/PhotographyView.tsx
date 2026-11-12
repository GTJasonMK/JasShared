"use client";
import type { Photo } from "@jas/content-core";
import PhotoGallery from "./PhotoGallery";

export function PhotographyView({ photos, title, description }: { photos: Photo[]; title: string; description: string }) {
  return <div className="photography-page">
    <header className="photography-heading"><div>
      <p className="photography-eyebrow" lang="en">Photography</p>
      <h1>{title}<span aria-hidden="true">。</span></h1>
      <p className="photography-intro">{description}</p>
    </div><p className="photography-total"><span>{String(photos.length).padStart(2, "0")}</span> 张作品</p></header>
    <PhotoGallery photos={photos} />
  </div>;
}
