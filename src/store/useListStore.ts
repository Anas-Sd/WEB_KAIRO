import { create } from "zustand";
import { TaskList, TaskListDto, ListItem, ListItemDto } from "@/types";
import { supabase } from "@/lib/supabase";

interface ListStoreState {
  lists: TaskList[];
  items: ListItem[];
  selectedListId: string | null;
  isLoading: boolean;
  error: string | null;
  isSelectionMode: boolean;
  selectedListIds: Set<string>;
  selectedItemIds: Set<string>;
  searchQuery: string;
  itemSearchQuery: string;
  completedSectionExpanded: boolean;

  // PIN Lock & Unlocked State
  lockedListPins: Record<string, string>; // listId -> pin
  unlockedListIds: Set<string>; // Session-based set of unlocked listIds
  fetchListPins: (userCode: string) => Promise<void>;
  setListPin: (userCode: string, listId: string, pin: string) => Promise<void>;
  removeListPin: (userCode: string, listId: string) => Promise<void>;
  unlockListTemporarily: (listId: string) => void;
  lockListAgain: (listId: string) => void;
  isListLocked: (listId: string) => boolean;

  // Actions
  fetchLists: (userCode: string) => Promise<void>;
  fetchItems: (userCode: string) => Promise<void>;
  subscribeRealtime: (userCode: string) => () => void;
  createList: (userCode: string, name: string, iconName: string) => Promise<TaskList | null>;
  updateList: (userCode: string, id: string, name: string, iconName: string) => Promise<void>;
  deleteList: (userCode: string, id: string) => Promise<void>;
  batchDeleteLists: (userCode: string, listIds: string[]) => Promise<void>;
  reorderLists: (userCode: string, reorderedLists: TaskList[]) => Promise<void>;
  moveListIntoList: (
    userCode: string,
    sourceListId: string,
    targetListId: string
  ) => Promise<void>;
  moveListsIntoList: (
    userCode: string,
    sourceListIds: string[],
    targetListId: string
  ) => Promise<void>;

  // List Item Actions
  createItem: (
    userCode: string,
    listId: string,
    title: string,
    parentId?: string | null,
    notes?: string | null,
    targetDate?: string | null,
    targetDateMillis?: number | null,
    iconName?: string
  ) => Promise<ListItem | null>;
  createMultipleItems: (
    userCode: string,
    listId: string,
    titles: string[],
    parentId?: string | null
  ) => Promise<void>;
  updateItem: (userCode: string, itemId: string, patch: Partial<ListItem>) => Promise<void>;
  toggleItemCompletion: (userCode: string, itemId: string) => Promise<void>;
  deleteItem: (userCode: string, itemId: string, cascade: boolean) => Promise<void>;
  batchDeleteItems: (userCode: string, itemIds: string[]) => Promise<void>;
  batchCompleteItems: (userCode: string, itemIds: string[]) => Promise<void>;
  adjustItemParent: (
    userCode: string,
    itemId: string,
    newParentId: string | null,
    moveChildren?: boolean
  ) => Promise<void>;
  batchAdjustItemParent: (
    userCode: string,
    itemIds: string[],
    newParentId: string | null
  ) => Promise<void>;
  moveItemsToParent: (
    userCode: string,
    itemIds: string[],
    targetListId: string,
    newParentId: string | null,
    moveSubtasks: boolean
  ) => Promise<void>;
  convertItemToStandaloneList: (
    userCode: string,
    itemId: string
  ) => Promise<TaskList | null>;
  convertLeafToParentWithSubtasks: (
    userCode: string,
    itemId: string,
    updatedTitle: string,
    updatedIconName: string,
    subtaskTitles: string[]
  ) => Promise<void>;
  reorderItems: (userCode: string, reorderedItems: ListItem[]) => Promise<void>;

  // Selection & UI
  setSelectedListId: (listId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setItemSearchQuery: (query: string) => void;
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;
  toggleSelectList: (listId: string) => void;
  toggleSelectItem: (itemId: string) => void;
  selectAllItems: (itemIds: string[]) => void;
  clearSelection: () => void;
  toggleCompletedSection: () => void;
}

function dtoListToDomain(dto: TaskListDto): TaskList {
  return {
    id: dto.id,
    userCode: dto.user_code,
    name: dto.name,
    iconName: dto.icon_name || "list",
    position: dto.position ?? 0,
    createdAt: dto.created_at ?? Date.now(),
    updatedAt: dto.updated_at ?? Date.now(),
  };
}

function listDomainToDto(list: TaskList): TaskListDto {
  return {
    id: list.id,
    user_code: list.userCode,
    name: list.name,
    icon_name: list.iconName,
    position: list.position,
    created_at: list.createdAt,
    updated_at: list.updatedAt,
  };
}

function dtoItemToDomain(dto: ListItemDto): ListItem {
  return {
    id: dto.id,
    userCode: dto.user_code,
    listId: dto.list_id,
    parentId: dto.parent_id ?? null,
    title: dto.title,
    iconName: dto.icon_name || "list",
    notes: dto.notes ?? null,
    targetDate: dto.target_date ?? null,
    targetDateMillis: dto.target_date_millis ?? null,
    isCompleted: dto.is_completed ?? false,
    position: dto.position ?? 0,
    completedAt: dto.completed_at ?? null,
    createdAt: dto.created_at ?? Date.now(),
    updatedAt: dto.updated_at ?? Date.now(),
  };
}

function itemDomainToDto(item: ListItem): ListItemDto {
  return {
    id: item.id,
    user_code: item.userCode,
    list_id: item.listId,
    parent_id: item.parentId,
    title: item.title,
    icon_name: item.iconName,
    notes: item.notes,
    target_date: item.targetDate,
    target_date_millis: item.targetDateMillis,
    is_completed: item.isCompleted,
    position: item.position,
    completed_at: item.completedAt,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

export function getItemDescendantIds(itemId: string, allItems: ListItem[]): Set<string> {
  const result = new Set<string>();
  const queue = [itemId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const item of allItems) {
      if (item.parentId === current && !result.has(item.id)) {
        result.add(item.id);
        queue.push(item.id);
      }
    }
  }
  return result;
}

export const useListStore = create<ListStoreState>((set, get) => ({
  lists: [],
  items: [],
  selectedListId: null,
  isLoading: false,
  error: null,
  isSelectionMode: false,
  selectedListIds: new Set<string>(),
  selectedItemIds: new Set<string>(),
  searchQuery: "",
  itemSearchQuery: "",
  completedSectionExpanded: true,
  lockedListPins: {},
  unlockedListIds: new Set<string>(),

  fetchListPins: async (userCode: string) => {
    if (!userCode) return;
    try {
      const configId = `sys_kairo_list_pins_${userCode}`;
      const { data, error } = await supabase
        .from("tasks")
        .select("notes")
        .eq("id", configId)
        .maybeSingle();

      if (!error && data && data.notes) {
        try {
          const parsed = JSON.parse(data.notes);
          if (parsed && typeof parsed === "object") {
            set({ lockedListPins: parsed });
          }
        } catch {}
      }
    } catch (e) {
      console.error("Error fetching list pins:", e);
    }
  },

  setListPin: async (userCode: string, listId: string, pin: string) => {
    if (!userCode || !listId || !pin) return;
    const current = { ...get().lockedListPins };
    current[listId] = pin;
    set({ lockedListPins: current });

    // Also remove from unlockedListIds if it was there
    const unlocked = new Set(get().unlockedListIds);
    unlocked.delete(listId);
    set({ unlockedListIds: unlocked });

    try {
      const configId = `sys_kairo_list_pins_${userCode}`;
      const payload = {
        id: configId,
        user_code: userCode,
        title: "__SYSTEM_LIST_PINS__",
        notes: JSON.stringify(current),
        due_date: "2099-01-01",
        due_time: "12:00",
        section: "TODAY",
        is_completed: false,
        updated_at: Date.now(),
      };
      await supabase.from("tasks").upsert(payload, { onConflict: "id" });
    } catch (e) {
      console.error("Error saving list pin to cloud:", e);
    }
  },

  removeListPin: async (userCode: string, listId: string) => {
    if (!userCode || !listId) return;
    const current = { ...get().lockedListPins };
    delete current[listId];
    set({ lockedListPins: current });

    const unlocked = new Set(get().unlockedListIds);
    unlocked.delete(listId);
    set({ unlockedListIds: unlocked });

    try {
      const configId = `sys_kairo_list_pins_${userCode}`;
      const payload = {
        id: configId,
        user_code: userCode,
        title: "__SYSTEM_LIST_PINS__",
        notes: JSON.stringify(current),
        due_date: "2099-01-01",
        due_time: "12:00",
        section: "TODAY",
        is_completed: false,
        updated_at: Date.now(),
      };
      await supabase.from("tasks").upsert(payload, { onConflict: "id" });
    } catch (e) {
      console.error("Error removing list pin from cloud:", e);
    }
  },

  unlockListTemporarily: (listId: string) => {
    const unlocked = new Set(get().unlockedListIds);
    unlocked.add(listId);
    set({ unlockedListIds: unlocked });
  },

  lockListAgain: (listId: string) => {
    const unlocked = new Set(get().unlockedListIds);
    unlocked.delete(listId);
    set({ unlockedListIds: unlocked });
  },

  isListLocked: (listId: string) => {
    const pin = get().lockedListPins[listId];
    if (!pin) return false;
    // If it has a pin and is not currently temporarily unlocked in this session
    return !get().unlockedListIds.has(listId);
  },

  fetchLists: async (userCode: string) => {
    if (!userCode) return;
    if (get().lists.length === 0) {
      set({ isLoading: true, error: null });
    }
    try {
      const { data, error } = await supabase
        .from("task_lists")
        .select("*")
        .eq("user_code", userCode)
        .order("position", { ascending: true });

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }
      set({ lists: (data || []).map(dtoListToDomain), isLoading: false });
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : "Failed to load lists",
        isLoading: false,
      });
    }
  },

  fetchItems: async (userCode: string) => {
    if (!userCode) return;
    try {
      const { data, error } = await supabase
        .from("list_items")
        .select("*")
        .eq("user_code", userCode)
        .order("position", { ascending: true });

      if (error) {
        console.error("Failed to load list items:", error);
        return;
      }
      set({ items: (data || []).map(dtoItemToDomain) });
    } catch (err) {
      console.error("Error loading items:", err);
    }
  },

  subscribeRealtime: (userCode: string) => {
    if (!userCode) return () => {};

    const listChannel = supabase
      .channel(`realtime:task_lists:${userCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_lists",
          filter: `user_code=eq.${userCode}`,
        },
        (payload) => {
          const current = get().lists;
          if (payload.eventType === "INSERT") {
            const newList = dtoListToDomain(payload.new as TaskListDto);
            if (!current.some((l) => l.id === newList.id)) {
              set({ lists: [...current, newList] });
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = dtoListToDomain(payload.new as TaskListDto);
            set({ lists: current.map((l) => (l.id === updated.id ? updated : l)) });
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id: string })?.id;
            if (deletedId) {
              set({ lists: current.filter((l) => l.id !== deletedId) });
            }
          }
        }
      )
      .subscribe();

    const itemChannel = supabase
      .channel(`realtime:list_items:${userCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "list_items",
          filter: `user_code=eq.${userCode}`,
        },
        (payload) => {
          const current = get().items;
          if (payload.eventType === "INSERT") {
            const newItem = dtoItemToDomain(payload.new as ListItemDto);
            if (!current.some((i) => i.id === newItem.id)) {
              set({ items: [...current, newItem] });
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = dtoItemToDomain(payload.new as ListItemDto);
            set({ items: current.map((i) => (i.id === updated.id ? updated : i)) });
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id: string })?.id;
            if (deletedId) {
              set({ items: current.filter((i) => i.id !== deletedId) });
            }
          }
        }
      )
      .subscribe();

    const pinsChannel = supabase
      .channel(`realtime:sys_list_pins:${userCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `id=eq.sys_kairo_list_pins_${userCode}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const row = payload.new as { notes?: string };
            if (row && row.notes) {
              try {
                const parsed = JSON.parse(row.notes);
                if (parsed && typeof parsed === "object") {
                  set({ lockedListPins: parsed });
                }
              } catch {}
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(listChannel);
      supabase.removeChannel(itemChannel);
      supabase.removeChannel(pinsChannel);
    };
  },

  createList: async (userCode: string, name: string, iconName: string) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const now = Date.now();
    const newList: TaskList = {
      id: crypto.randomUUID(),
      userCode,
      name: trimmed,
      iconName: iconName || "list",
      position: get().lists.length,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({ lists: [...state.lists, newList] }));

    await supabase.from("task_lists").insert(listDomainToDto(newList));
    return newList;
  },

  updateList: async (userCode: string, id: string, name: string, iconName: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const now = Date.now();

    set((state) => ({
      lists: state.lists.map((l) =>
        l.id === id ? { ...l, name: trimmed, iconName, updatedAt: now } : l
      ),
    }));

    await supabase
      .from("task_lists")
      .update({ name: trimmed, icon_name: iconName, updated_at: now })
      .eq("id", id);
  },

  deleteList: async (userCode: string, id: string) => {
    set((state) => ({
      lists: state.lists.filter((l) => l.id !== id),
      items: state.items.filter((i) => i.listId !== id),
      selectedListId: state.selectedListId === id ? null : state.selectedListId,
    }));

    await supabase.from("list_items").delete().eq("list_id", id);
    await supabase.from("task_lists").delete().eq("id", id);
  },

  batchDeleteLists: async (userCode: string, listIds: string[]) => {
    const setIds = new Set(listIds);
    set((state) => ({
      lists: state.lists.filter((l) => !setIds.has(l.id)),
      items: state.items.filter((i) => !setIds.has(i.listId)),
      selectedListIds: new Set(),
      isSelectionMode: false,
    }));

    for (const id of listIds) {
      await supabase.from("list_items").delete().eq("list_id", id);
      await supabase.from("task_lists").delete().eq("id", id);
    }
  },

  reorderLists: async (userCode: string, reorderedLists: TaskList[]) => {
    const updated = reorderedLists.map((l, idx) => ({ ...l, position: idx }));
    set({ lists: updated });

    for (const l of updated) {
      await supabase.from("task_lists").update({ position: l.position }).eq("id", l.id);
    }
  },

  moveListsIntoList: async (
    userCode: string,
    sourceListIds: string[],
    targetListId: string
  ) => {
    const validSourceIds = sourceListIds.filter((id) => id !== targetListId);
    if (validSourceIds.length === 0) return;

    const currentLists = get().lists;
    const targetList = currentLists.find((l) => l.id === targetListId);
    if (!targetList) return;

    const sourceLists = currentLists.filter((l) => validSourceIds.includes(l.id));
    if (sourceLists.length === 0) return;

    const currentItems = get().items;
    const targetItems = currentItems.filter((i) => i.listId === targetListId);
    let nextPosition = targetItems.length;
    const now = Date.now();

    const allNewParentItems: ListItem[] = [];
    const allMigratedItems: ListItem[] = [];

    sourceLists.forEach((sourceList) => {
      const sourceItems = currentItems.filter((i) => i.listId === sourceList.id);
      const parentItem: ListItem = {
        id: crypto.randomUUID(),
        userCode,
        listId: targetListId,
        parentId: null,
        title: sourceList.name,
        iconName: sourceList.iconName || "list",
        notes: null,
        targetDate: null,
        targetDateMillis: null,
        isCompleted: false,
        position: nextPosition++,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      allNewParentItems.push(parentItem);

      const migrated = sourceItems.map((item) => {
        const newParentId = item.parentId === null ? parentItem.id : item.parentId;
        return {
          ...item,
          listId: targetListId,
          parentId: newParentId,
          updatedAt: now,
        };
      });
      allMigratedItems.push(...migrated);
    });

    const validSourceSet = new Set(validSourceIds);

    // Update store state immediately
    set((state) => ({
      lists: state.lists.filter((l) => !validSourceSet.has(l.id)),
      items: [
        ...state.items.filter((i) => !validSourceSet.has(i.listId)),
        ...allNewParentItems,
        ...allMigratedItems,
      ],
      selectedListIds: new Set(),
      isSelectionMode: false,
    }));

    // Sync to Supabase:
    // 1. Insert parent items FIRST so foreign keys can resolve
    if (allNewParentItems.length > 0) {
      const parentDtos = allNewParentItems.map(itemDomainToDto);
      const { error: parentErr } = await supabase.from("list_items").insert(parentDtos);
      if (parentErr) {
        console.error("Failed to insert new parent items in Supabase:", parentErr);
      }
    }

    // 2. Upsert migrated child items under the new parent items
    if (allMigratedItems.length > 0) {
      const migratedDtos = allMigratedItems.map(itemDomainToDto);
      const { error: migratedErr } = await supabase.from("list_items").upsert(migratedDtos);
      if (migratedErr) {
        console.error("Failed to upsert migrated list items:", migratedErr);
      }
    }

    // 3. Delete source task lists
    for (const sId of validSourceIds) {
      await supabase.from("task_lists").delete().eq("id", sId);
    }
  },

  moveListIntoList: async (
    userCode: string,
    sourceListId: string,
    targetListId: string
  ) => {
    await get().moveListsIntoList(userCode, [sourceListId], targetListId);
  },

  // List Items
  createItem: async (
    userCode: string,
    listId: string,
    title: string,
    parentId = null,
    notes = null,
    targetDate = null,
    targetDateMillis = null,
    iconName = "list"
  ) => {
    const trimmed = title.trim();
    if (!trimmed) return null;
    const now = Date.now();
    const newItem: ListItem = {
      id: crypto.randomUUID(),
      userCode,
      listId,
      parentId,
      title: trimmed,
      iconName: iconName || "list",
      notes: notes || null,
      targetDate: targetDate || null,
      targetDateMillis: targetDateMillis || null,
      isCompleted: false,
      position: get().items.filter((i) => i.listId === listId && i.parentId === parentId).length,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({ items: [...state.items, newItem] }));
    await supabase.from("list_items").insert(itemDomainToDto(newItem));
    return newItem;
  },

  createMultipleItems: async (
    userCode: string,
    listId: string,
    titles: string[],
    parentId = null
  ) => {
    const nonBlank = titles.map((t) => t.trim()).filter((t) => t.length > 0);
    if (nonBlank.length === 0) return;

    const now = Date.now();
    const currentCount = get().items.filter(
      (i) => i.listId === listId && i.parentId === parentId
    ).length;

    const newItems: ListItem[] = nonBlank.map((title, index) => ({
      id: crypto.randomUUID(),
      userCode,
      listId,
      parentId,
      title,
      iconName: "list",
      notes: null,
      targetDate: null,
      targetDateMillis: null,
      isCompleted: false,
      position: currentCount + index,
      completedAt: null,
      createdAt: now + index,
      updatedAt: now + index,
    }));

    set((state) => ({ items: [...state.items, ...newItems] }));
    const dtos = newItems.map(itemDomainToDto);
    await supabase.from("list_items").insert(dtos);
  },

  updateItem: async (userCode: string, itemId: string, patch: Partial<ListItem>) => {
    const now = Date.now();
    set((state) => ({
      items: state.items.map((i) =>
        i.id === itemId ? { ...i, ...patch, updatedAt: now } : i
      ),
    }));

    const existing = get().items.find((i) => i.id === itemId);
    if (existing) {
      await supabase.from("list_items").update(itemDomainToDto(existing)).eq("id", itemId);
    }
  },

  toggleItemCompletion: async (userCode: string, itemId: string) => {
    const all = get().items;
    const target = all.find((i) => i.id === itemId);
    if (!target) return;

    const now = Date.now();
    const newIsCompleted = !target.isCompleted;
    const listId = target.listId;
    const itemsInList = all.filter((i) => i.listId === listId);
    const byId = new Map(itemsInList.map((i) => [i.id, { ...i }]));
    const affectedIds = new Set<string>();

    if (newIsCompleted) {
      // 1. Target and ALL recursive descendants become COMPLETED
      const toComplete = new Set<string>([itemId]);
      for (const d of getItemDescendantIds(itemId, itemsInList)) {
        toComplete.add(d);
      }

      for (const id of toComplete) {
        const itm = byId.get(id);
        if (itm) {
          itm.isCompleted = true;
          itm.completedAt = now;
          itm.updatedAt = now;
        }
      }

      // 2. Cascade upward: A parent becomes completed if ALL its direct children are completed
      let currentParentId = target.parentId;
      const visited = new Set<string>();
      while (currentParentId && visited.add(currentParentId)) {
        const parentItem = byId.get(currentParentId);
        if (!parentItem) break;
        const siblings = Array.from(byId.values()).filter((i) => i.parentId === currentParentId);
        const allSiblingsDone =
          siblings.length > 0 &&
          siblings.every((s) => s.isCompleted || toComplete.has(s.id));
        if (allSiblingsDone) {
          toComplete.add(currentParentId);
          parentItem.isCompleted = true;
          parentItem.completedAt = now;
          parentItem.updatedAt = now;
          currentParentId = parentItem.parentId;
        } else {
          break;
        }
      }

      for (const id of toComplete) affectedIds.add(id);
    } else {
      // UNTICKING (Reopening)
      const toReopen = new Set<string>([itemId]);

      // Rule 1: Unticking a parent -> all its recursive descendants become not done
      for (const d of getItemDescendantIds(itemId, itemsInList)) {
        toReopen.add(d);
      }

      // Rule 2: Unticking a subtask -> parent & all done ancestors become not done
      let curr = target.parentId;
      const visited = new Set<string>();
      while (curr && visited.add(curr)) {
        toReopen.add(curr);
        const p = byId.get(curr);
        curr = p?.parentId || null;
      }

      for (const id of toReopen) {
        const itm = byId.get(id);
        if (itm) {
          itm.isCompleted = false;
          itm.completedAt = null;
          itm.updatedAt = now;
        }
      }

      for (const id of toReopen) affectedIds.add(id);
    }

    const updated = all.map((item) => byId.get(item.id) || item);
    set({ items: updated });

    const changedItems = Array.from(affectedIds)
      .map((id) => byId.get(id))
      .filter(Boolean) as ListItem[];

    for (const c of changedItems) {
      await supabase
        .from("list_items")
        .update({
          is_completed: c.isCompleted,
          completed_at: c.completedAt,
          updated_at: c.updatedAt,
        })
        .eq("id", c.id);
    }
  },

  deleteItem: async (userCode: string, itemId: string, cascade: boolean) => {
    const all = get().items;
    const target = all.find((i) => i.id === itemId);
    if (!target) return;

    let toDeleteIds: string[] = [itemId];
    let toOrphan: ListItem[] = [];

    if (cascade) {
      toDeleteIds = [itemId, ...Array.from(getItemDescendantIds(itemId, all))];
    } else {
      toOrphan = all
        .filter((i) => i.parentId === itemId)
        .map((i) => ({ ...i, parentId: target.parentId, updatedAt: Date.now() }));
    }

    const deleteSet = new Set(toDeleteIds);
    set((state) => ({
      items: state.items
        .filter((i) => !deleteSet.has(i.id))
        .map((i) => {
          const o = toOrphan.find((orph) => orph.id === i.id);
          return o || i;
        }),
    }));

    const { error: delErr } = await supabase.from("list_items").delete().in("id", toDeleteIds);
    if (delErr) {
      console.error("Failed to delete list_items in Supabase:", delErr);
    }

    for (const o of toOrphan) {
      await supabase
        .from("list_items")
        .update({ parent_id: o.parentId, updated_at: o.updatedAt })
        .eq("id", o.id);
    }
  },

  batchDeleteItems: async (userCode: string, itemIds: string[]) => {
    if (itemIds.length === 0) return;
    const all = get().items;
    const deleteSet = new Set<string>();

    for (const id of itemIds) {
      deleteSet.add(id);
      for (const d of getItemDescendantIds(id, all)) {
        deleteSet.add(d);
      }
    }

    const deleteIds = Array.from(deleteSet);
    set((state) => ({
      items: state.items.filter((i) => !deleteSet.has(i.id)),
      selectedItemIds: new Set(),
      isSelectionMode: false,
    }));

    const { error: delErr } = await supabase.from("list_items").delete().in("id", deleteIds);
    if (delErr) {
      console.error("Failed to batch delete list_items in Supabase:", delErr);
    }
  },

  batchCompleteItems: async (userCode: string, itemIds: string[]) => {
    if (itemIds.length === 0) return;
    const all = get().items;
    const now = Date.now();
    const completeSet = new Set<string>();

    for (const id of itemIds) {
      completeSet.add(id);
      for (const d of getItemDescendantIds(id, all)) {
        completeSet.add(d);
      }
    }

    const byId = new Map(all.map((i) => [i.id, { ...i }]));
    for (const id of completeSet) {
      const itm = byId.get(id);
      if (itm) {
        itm.isCompleted = true;
        itm.completedAt = now;
        itm.updatedAt = now;
      }
    }

    // Cascade upward for any parent whose direct children are all done
    for (const id of itemIds) {
      let currentParentId = byId.get(id)?.parentId;
      const visited = new Set<string>();
      while (currentParentId && visited.add(currentParentId)) {
        const parentItem = byId.get(currentParentId);
        if (!parentItem) break;
        const siblings = Array.from(byId.values()).filter((i) => i.parentId === currentParentId);
        const allSiblingsDone =
          siblings.length > 0 &&
          siblings.every((s) => s.isCompleted || completeSet.has(s.id));
        if (allSiblingsDone) {
          completeSet.add(currentParentId);
          parentItem.isCompleted = true;
          parentItem.completedAt = now;
          parentItem.updatedAt = now;
          currentParentId = parentItem.parentId;
        } else {
          break;
        }
      }
    }

    set({
      items: all.map((i) => byId.get(i.id) || i),
      selectedItemIds: new Set(),
      isSelectionMode: false,
    });

    const changed = Array.from(completeSet)
      .map((id) => byId.get(id))
      .filter(Boolean) as ListItem[];

    for (const c of changed) {
      await supabase
        .from("list_items")
        .update({ is_completed: true, completed_at: now, updated_at: now })
        .eq("id", c.id);
    }
  },

  adjustItemParent: async (
    userCode: string,
    itemId: string,
    newParentId: string | null,
    moveChildren = true
  ) => {
    const all = get().items;
    const target = all.find((i) => i.id === itemId);
    if (!target) return;

    if (!moveChildren) {
      const children = all.filter((i) => i.parentId === itemId);
      for (const c of children) {
        await supabase.from("list_items").update({ parent_id: target.parentId }).eq("id", c.id);
      }
    }

    set((state) => ({
      items: state.items.map((i) => {
        if (i.id === itemId) return { ...i, parentId: newParentId, updatedAt: Date.now() };
        if (!moveChildren && i.parentId === itemId) {
          return { ...i, parentId: target.parentId, updatedAt: Date.now() };
        }
        return i;
      }),
    }));

    await supabase.from("list_items").update({ parent_id: newParentId, updated_at: Date.now() }).eq("id", itemId);
  },

  batchAdjustItemParent: async (userCode: string, itemIds: string[], newParentId: string | null) => {
    set((state) => ({
      items: state.items.map((i) =>
        itemIds.includes(i.id) ? { ...i, parentId: newParentId, updatedAt: Date.now() } : i
      ),
      selectedItemIds: new Set(),
      isSelectionMode: false,
    }));

    for (const id of itemIds) {
      await supabase.from("list_items").update({ parent_id: newParentId, updated_at: Date.now() }).eq("id", id);
    }
  },

  convertLeafToParentWithSubtasks: async (
    userCode: string,
    itemId: string,
    updatedTitle: string,
    updatedIconName: string,
    subtaskTitles: string[]
  ) => {
    const all = get().items;
    const target = all.find((i) => i.id === itemId);
    if (!target) return;

    const now = Date.now();
    const updatedItem: ListItem = {
      ...target,
      title: updatedTitle.trim(),
      iconName: updatedIconName,
      updatedAt: now,
    };

    const existingInList = all.filter((i) => i.listId === target.listId);
    let nextPos = existingInList.length;

    const newSubtasks: ListItem[] = subtaskTitles
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .map((title, idx) => ({
        id: crypto.randomUUID(),
        userCode,
        listId: target.listId,
        parentId: itemId,
        title,
        iconName: "list",
        notes: null,
        targetDate: null,
        targetDateMillis: null,
        isCompleted: false,
        position: nextPos + idx,
        completedAt: null,
        createdAt: now + idx,
        updatedAt: now + idx,
      }));

    set((state) => ({
      items: [
        ...state.items.map((i) => (i.id === itemId ? updatedItem : i)),
        ...newSubtasks,
      ],
    }));

    await supabase
      .from("list_items")
      .update({
        title: updatedItem.title,
        icon_name: updatedItem.iconName,
        updated_at: now,
      })
      .eq("id", itemId);

    if (newSubtasks.length > 0) {
      await supabase.from("list_items").insert(newSubtasks.map(itemDomainToDto));
    }
  },

  moveItemsToParent: async (
    userCode: string,
    itemIds: string[],
    targetListId: string,
    newParentId: string | null,
    moveSubtasks: boolean
  ) => {
    if (itemIds.length === 0) return;
    const all = get().items;
    const now = Date.now();
    const itemSet = new Set(itemIds);

    // If moveSubtasks, get all descendants
    const allMovedIds = new Set<string>();
    for (const id of itemIds) {
      allMovedIds.add(id);
      if (moveSubtasks) {
        for (const d of getItemDescendantIds(id, all)) {
          allMovedIds.add(d);
        }
      }
    }

    const updated = all.map((item) => {
      if (itemSet.has(item.id)) {
        return {
          ...item,
          listId: targetListId,
          parentId: newParentId,
          updatedAt: now,
        };
      }
      if (allMovedIds.has(item.id)) {
        return {
          ...item,
          listId: targetListId,
          updatedAt: now,
        };
      }
      if (!moveSubtasks && item.parentId && itemSet.has(item.parentId)) {
        const origParent = all.find((p) => p.id === item.parentId)?.parentId || null;
        return {
          ...item,
          parentId: origParent,
          updatedAt: now,
        };
      }
      return item;
    });

    set({
      items: updated,
      selectedItemIds: new Set(),
      isSelectionMode: false,
    });

    const changedItems = updated.filter((i) => allMovedIds.has(i.id));
    for (const itm of changedItems) {
      await supabase
        .from("list_items")
        .update({
          list_id: itm.listId,
          parent_id: itm.parentId,
          updated_at: now,
        })
        .eq("id", itm.id);
    }
  },

  convertItemToStandaloneList: async (userCode: string, itemId: string) => {
    const all = get().items;
    const target = all.find((i) => i.id === itemId);
    if (!target) return null;

    const now = Date.now();
    const currentLists = get().lists;
    const sourceListIndex = currentLists.findIndex((l) => l.id === target.listId);
    const insertPos = sourceListIndex !== -1 ? sourceListIndex + 1 : currentLists.length;

    const newList: TaskList = {
      id: crypto.randomUUID(),
      userCode,
      name: target.title,
      iconName: target.iconName || "list",
      position: insertPos,
      createdAt: now,
      updatedAt: now,
    };

    const descendantIds = getItemDescendantIds(itemId, all);

    const updatedLists = [...currentLists];
    updatedLists.splice(insertPos, 0, newList);
    const reorderedLists = updatedLists.map((l, idx) => ({ ...l, position: idx }));

    const newItems = all
      .filter((i) => i.id !== itemId)
      .map((item) => {
        if (descendantIds.has(item.id)) {
          const newParentId = item.parentId === itemId ? null : item.parentId;
          return {
            ...item,
            listId: newList.id,
            parentId: newParentId,
            updatedAt: now,
          };
        }
        return item;
      });

    set({
      lists: reorderedLists,
      items: newItems,
    });

    // Supabase sync
    await supabase.from("task_lists").insert(listDomainToDto(newList));
    await supabase.from("list_items").delete().eq("id", itemId);

    const migrated = newItems.filter((i) => descendantIds.has(i.id));
    for (const m of migrated) {
      await supabase
        .from("list_items")
        .update({
          list_id: m.listId,
          parent_id: m.parentId,
          updated_at: now,
        })
        .eq("id", m.id);
    }

    for (const l of reorderedLists) {
      await supabase.from("task_lists").update({ position: l.position }).eq("id", l.id);
    }

    return newList;
  },

  reorderItems: async (userCode: string, reorderedItems: ListItem[]) => {
    const updated = reorderedItems.map((item, idx) => ({ ...item, position: idx }));
    set((state) => {
      const reorderedIds = new Set(updated.map((u) => u.id));
      return {
        items: [...state.items.filter((i) => !reorderedIds.has(i.id)), ...updated],
      };
    });

    for (const item of updated) {
      await supabase.from("list_items").update({ position: item.position }).eq("id", item.id);
    }
  },

  setSelectedListId: (listId: string | null) => set({ selectedListId: listId, itemSearchQuery: "" }),
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setItemSearchQuery: (query: string) => set({ itemSearchQuery: query }),

  enterSelectionMode: () =>
    set({ isSelectionMode: true, selectedListIds: new Set(), selectedItemIds: new Set() }),
  exitSelectionMode: () =>
    set({ isSelectionMode: false, selectedListIds: new Set(), selectedItemIds: new Set() }),

  toggleSelectList: (listId: string) =>
    set((state) => {
      const next = new Set(state.selectedListIds);
      if (next.has(listId)) next.delete(listId);
      else next.add(listId);
      return { selectedListIds: next };
    }),

  toggleSelectItem: (itemId: string) =>
    set((state) => {
      const next = new Set(state.selectedItemIds);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return { selectedItemIds: next };
    }),

  selectAllItems: (itemIds: string[]) =>
    set((state) => {
      const next = new Set(state.selectedItemIds);
      const allSelected = itemIds.length > 0 && itemIds.every((id) => next.has(id));
      if (allSelected) {
        itemIds.forEach((id) => next.delete(id));
      } else {
        itemIds.forEach((id) => next.add(id));
      }
      return { selectedItemIds: next };
    }),

  clearSelection: () => set({ selectedListIds: new Set(), selectedItemIds: new Set() }),
  toggleCompletedSection: () =>
    set((state) => ({ completedSectionExpanded: !state.completedSectionExpanded })),
}));
