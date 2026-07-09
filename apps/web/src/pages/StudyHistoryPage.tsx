import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StudyItemListFilters, StudyItemSummary, StudyItemType, StudySourceType } from "@scenego/shared";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { deleteStudyItem, listStudyItems } from "../api/studyItems.js";
import { useAuthStore } from "../stores/authStore.js";

export function StudyHistoryPage() {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [itemType, setItemType] = useState<StudyItemType | "">("");
  const [sourceType, setSourceType] = useState<StudySourceType | "">("");
  const [tag, setTag] = useState("");
  const [favoriteFilter, setFavoriteFilter] = useState<"all" | "favorite" | "normal">("all");
  const filters = useMemo<StudyItemListFilters>(
    () => ({
      keyword: optionalString(keyword),
      itemType: itemType || undefined,
      sourceType: sourceType || undefined,
      tag: optionalString(tag),
      isFavorite: favoriteFilter === "all" ? undefined : favoriteFilter === "favorite"
    }),
    [favoriteFilter, itemType, keyword, sourceType, tag]
  );
  const historyQuery = useQuery({
    queryKey: ["study-items", filters],
    queryFn: () => listStudyItems(token ?? "", filters),
    enabled: Boolean(token)
  });
  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => deleteStudyItem(token ?? "", itemId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["study-items"] });
      void queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
      void queryClient.invalidateQueries({ queryKey: ["favorite-sentences"] });
    }
  });
  const deleteError = deleteMutation.error instanceof Error ? deleteMutation.error.message : undefined;

  function handleDelete(item: StudyItemSummary) {
    const confirmed = window.confirm(`删除这条学习记录？\n\n${item.textOriginal}`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(item.id);
  }

  return (
    <section className="space-y-4">
      <div className="rounded border border-line bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">学习历史</h1>
            <p className="mt-1 text-sm text-slate-600">文本学习保存的内容会出现在这里。</p>
          </div>
          <Link className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white" to="/text-study">
            文本学习
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <input
            className="rounded border border-line px-3 py-2 text-sm md:col-span-2"
            placeholder="搜索原文、翻译、备注"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <select
            className="rounded border border-line bg-white px-3 py-2 text-sm"
            value={itemType}
            onChange={(event) => setItemType(event.target.value as StudyItemType | "")}
          >
            <option value="">全部类型</option>
            {itemTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="rounded border border-line bg-white px-3 py-2 text-sm"
            value={sourceType}
            onChange={(event) => setSourceType(event.target.value as StudySourceType | "")}
          >
            <option value="">全部来源</option>
            {sourceTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="rounded border border-line bg-white px-3 py-2 text-sm"
            value={favoriteFilter}
            onChange={(event) => setFavoriteFilter(event.target.value as "all" | "favorite" | "normal")}
          >
            <option value="all">全部收藏</option>
            <option value="favorite">已收藏</option>
            <option value="normal">未收藏</option>
          </select>
          <input
            className="rounded border border-line px-3 py-2 text-sm"
            placeholder="标签"
            value={tag}
            onChange={(event) => setTag(event.target.value)}
          />
        </div>
        {deleteError ? <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{deleteError}</p> : null}
      </div>

      {historyQuery.isLoading ? (
        <div className="rounded border border-line bg-white p-8 text-center text-sm text-slate-500">加载中...</div>
      ) : historyQuery.data?.items.length ? (
        <div className="divide-y divide-line rounded border border-line bg-white">
          {historyQuery.data.items.map((item) => (
            <article
              key={item.id}
              className="grid gap-3 p-4 hover:bg-panel md:grid-cols-[120px_minmax(0,1fr)_220px]"
            >
              <div>
                <span className="rounded bg-panel px-2 py-1 text-xs font-semibold text-slate-600">
                  {itemTypeLabels[item.itemType]}
                </span>
                {item.isFavorite ? <p className="mt-2 text-xs text-accent">已收藏</p> : null}
              </div>
              <div>
                <Link className="block hover:text-accent" to={`/study-items/${item.id}`}>
                  <p className="font-medium">{item.textOriginal}</p>
                  {item.translation ? <p className="mt-1 text-sm text-slate-600">{item.translation}</p> : null}
                </Link>
                {item.tags.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.tags.map((itemTag) => (
                      <span key={itemTag} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
                        {itemTag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 md:justify-end md:text-right">
                <div className="w-full">
                  <p>{sourceTypeLabels[item.sourceType]}</p>
                  <p className="mt-1">{item.sourceNote ?? formatDate(item.updatedAt)}</p>
                </div>
                <Link
                  className="rounded border border-line px-3 py-2 text-sm text-slate-700"
                  to={`/study-items/${item.id}`}
                >
                  查看
                </Link>
                <button
                  className="rounded border border-red-200 px-3 py-2 text-sm text-red-600 disabled:opacity-50"
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => handleDelete(item)}
                >
                  删除记录
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded border border-dashed border-line bg-white p-8 text-center text-sm text-slate-500">
          没有找到学习记录
        </div>
      )}
    </section>
  );
}

const itemTypeOptions: Array<{ value: StudyItemType; label: string }> = [
  { value: "word", label: "单词" },
  { value: "phrase", label: "短语" },
  { value: "sentence", label: "句子" },
  { value: "paragraph", label: "段落" },
  { value: "mixed", label: "混合" }
];

const sourceTypeOptions: Array<{ value: StudySourceType; label: string }> = [
  { value: "manual_input", label: "手动输入" },
  { value: "video_subtitle", label: "视频字幕" },
  { value: "external_manual", label: "外链手动" }
];

const itemTypeLabels = Object.fromEntries(itemTypeOptions.map((option) => [option.value, option.label])) as Record<
  StudyItemType,
  string
>;

const sourceTypeLabels = Object.fromEntries(sourceTypeOptions.map((option) => [option.value, option.label])) as Record<
  StudySourceType,
  string
>;

function optionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
