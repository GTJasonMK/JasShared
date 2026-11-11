interface DateSortable {
  date: string;
  slug: string;
}

export function compareDateDescThenSlug<T extends DateSortable>(a: T, b: T): number {
  if (a.date !== b.date) {
    return a.date > b.date ? -1 : 1;
  }

  return a.slug.localeCompare(b.slug);
}
