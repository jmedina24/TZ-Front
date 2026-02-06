export const buildCategoryIndex = (categories = []) => {
  const categoryMap = new Map();
  const subCategoryMap = new Map();

  for (const cat of categories) {
    if (!cat?.id) continue;

    categoryMap.set(cat.id, cat.nombre || cat.id);

    const subs = Array.isArray(cat.subcategorias) ? cat.subcategorias : [];
    for (const sub of subs) {
      if (!sub?.id) continue;
      subCategoryMap.set(`${cat.id}::${sub.id}`, sub.nombre || sub.id);
    }
  }

  return { categoryMap, subCategoryMap };
};

export const getCategoryLabelFromIndex = (index, categoryId, subCategoryId) => {
  if (!index || !categoryId) return null;

  const catName = index.categoryMap?.get(categoryId);
  if (!catName) return null;

  if (!subCategoryId) return catName;

  const subName = index.subCategoryMap?.get(`${categoryId}::${subCategoryId}`);
  if (!subName) return catName;

  return `${catName} • ${subName}`;
};
