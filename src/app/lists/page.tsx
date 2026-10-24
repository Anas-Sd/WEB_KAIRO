"use client";

import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  Plus,
  Search,
  X,
  MoreVertical,
  CheckSquare,
  RefreshCw,
  Layers,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import { AppShell } from "@/components/AppShell";
import { AppHeader } from "@/components/AppHeader";
import { ListCard } from "@/components/ListCard";
import { CreateEditListDialog } from "@/components/CreateEditListDialog";
import { ListItemRow } from "@/components/ListItemTree";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { SelectionActionBar } from "@/components/SelectionActionBar";
import { renderListIcon } from "@/components/ListIconPicker";
import {
  AddMultipleItemsDialog,
  EditItemDialog,
  ItemDetailsDialog,
  AdjustItemParentDialog,
  DeleteItemDialog,
} from "@/components/ListItemDialogs";

import { useAuthStore } from "@/store/useAuthStore";
import { useListStore } from "@/store/useListStore";
import { TaskList, ListItem } from "@/types";

export default function ListsPage() {
  const { user } = useAuthStore();
  const {
    lists,
    items,
    selectedListId,
    setSelectedListId,
    searchQuery,
    setSearchQuery,
    itemSearchQuery,
    setItemSearchQuery,
    isSelectionMode,
    enterSelectionMode,
    exitSelectionMode,
    selectedListIds,
    toggleSelectList,
    selectedItemIds,
    toggleSelectItem,
    clearSelection,
    completedSectionExpanded,
    toggleCompletedSection,
    fetchLists,
    fetchItems,
    createList,
    updateList,
    deleteList,
    batchDeleteLists,
    reorderLists,
    createItem,
    createMultipleItems,
    updateItem,
    toggleItemCompletion,
    deleteItem,
    batchDeleteItems,
    batchCompleteItems,
    adjustItemParent,
    batchAdjustItemParent,
    reorderItems,
  } = useListStore();

  const userCode = user?.code || "";

  // Modals state
  const [createListOpen, setCreateListOpen] = useState(false);
  const [listToEdit, setListToEdit] = useState<TaskList | null>(null);
  const [listToDelete, setListToDelete] = useState<TaskList | null>(null);

  // Item Modals state
  const [quickItemTitle, setQuickItemTitle] = useState("");
  const [addMultipleOpen, setAddMultipleOpen] = useState(false);
  const [parentForSubtasks, setParentForSubtasks] = useState<ListItem | null>(null);
  const [itemToEdit, setItemToEdit] = useState<ListItem | null>(null);
  const [itemForDetails, setItemForDetails] = useState<ListItem | null>(null);
  const [itemForAdjustParent, setItemForAdjustParent] = useState<ListItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ListItem | null>(null);

  // In-list search toggle
  const [isItemSearchOpen, setIsItemSearchOpen] = useState(false);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const currentList = useMemo(
    () => lists.find((l) => l.id === selectedListId) || null,
    [lists, selectedListId]
  );

  // List stats: total & completed
  const listStatsMap = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>();
    for (const l of lists) {
      const listItems = items.filter((i) => i.listId === l.id);
      const done = listItems.filter((i) => i.isCompleted).length;
      map.set(l.id, { total: listItems.length, completed: done });
    }
    return map;
  }, [lists, items]);

  // Filtered lists for overview
  const filteredLists = useMemo(() => {
    if (!searchQuery.trim()) return lists;
    const q = searchQuery.toLowerCase().trim();
    return lists.filter((l) => l.name.toLowerCase().includes(q));
  }, [lists, searchQuery]);

  // Items for currently selected list
  const currentListItems = useMemo(() => {
    if (!selectedListId) return [];
    return items.filter((i) => i.listId === selectedListId);
  }, [items, selectedListId]);

  // Filtered items in detail view
  const displayItems = useMemo(() => {
    if (!itemSearchQuery.trim()) return currentListItems;
    const q = itemSearchQuery.toLowerCase().trim();
    return currentListItems.filter(
      (i) => i.title.toLowerCase().includes(q) || (i.notes && i.notes.toLowerCase().includes(q))
    );
  }, [currentListItems, itemSearchQuery]);

  // Tree separation: Root items vs Children
  const { activeRootItems, completedItems, childrenMap } = useMemo(() => {
    const children = new Map<string, ListItem[]>();
    const activeRoots: ListItem[] = [];
    const completed: ListItem[] = [];

    for (const item of displayItems) {
      if (item.parentId) {
        if (!children.has(item.parentId)) children.set(item.parentId, []);
        children.get(item.parentId)!.push(item);
      }
    }

    for (const item of displayItems) {
      if (!item.parentId) {
        if (item.isCompleted) {
          completed.push(item);
        } else {
          activeRoots.push(item);
        }
      }
    }

    return {
      activeRootItems: activeRoots.sort((a, b) => a.position - b.position),
      completedItems: completed.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)),
      childrenMap: children,
    };
  }, [displayItems]);

  const handleQuickAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickItemTitle.trim() || !selectedListId) return;
    const title = quickItemTitle.trim();
    setQuickItemTitle("");
    await createItem(userCode, selectedListId, title);
  };

  const handleListDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = filteredLists.findIndex((l) => l.id === active.id);
    const newIdx = filteredLists.findIndex((l) => l.id === over.id);
    if (oldIdx !== -1 && newIdx !== -1) {
      const reordered = arrayMove(filteredLists, oldIdx, newIdx);
      await reorderLists(userCode, reordered);
    }
  };

  const currentStats = currentList ? listStatsMap.get(currentList.id) : null;
  const currentPercent =
    currentStats && currentStats.total > 0
      ? Math.round((currentStats.completed / currentStats.total) * 100)
      : 0;

  return (
    <AppShell>
      {({ onOpenSettings }) => (
        <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto px-4 sm:px-6">
          {/* ======================================================== */}
          {/* SCREEN 1: LISTS OVERVIEW SCREEN                           */}
          {/* ======================================================== */}
          {!selectedListId ? (
            <>
              <AppHeader onOpenSettings={onOpenSettings} />

              {/* Persistent Search and Controls Row */}
              <div className="flex items-center gap-2 mt-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#918EA2] pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search lists..."
                    className="w-full bg-[#111114] border border-[#1C1C20] hover:border-[#474556]/50 focus:border-[#C5C0FF] rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-[#E3E1EC] placeholder-[#918EA2] transition-colors focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#918EA2] hover:text-white p-0.5 rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setCreateListOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#111114] border border-[#1C1C20] text-[#C5C0FF] hover:bg-[#C5C0FF]/10 hover:border-[#C5C0FF]/40 transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New List</span>
                </button>

                {/* 3-dots Menu Button */}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      type="button"
                      className="p-2 rounded-xl bg-[#111114] border border-[#1C1C20] text-[#918EA2] hover:text-white hover:border-[#474556] transition-colors shrink-0"
                      title="More options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      align="end"
                      sideOffset={6}
                      className="z-50 min-w-[170px] bg-[#1C1C20] border border-[#474556]/40 rounded-xl p-1 shadow-2xl animate-in fade-in-80"
                    >
                      <DropdownMenu.Item
                        onClick={() => {
                          if (isSelectionMode) exitSelectionMode();
                          else enterSelectionMode();
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg cursor-pointer outline-none transition-colors text-[#E3E1EC] hover:bg-[#252529] hover:text-[#C5C0FF]"
                      >
                        <CheckSquare className="w-4 h-4 text-[#C5C0FF]" />
                        <span>{isSelectionMode ? "Exit Selection" : "Select Lists"}</span>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        onClick={() => {
                          fetchLists(userCode);
                          fetchItems(userCode);
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg cursor-pointer outline-none transition-colors text-[#E3E1EC] hover:bg-[#252529] hover:text-[#68DBA9]"
                      >
                        <RefreshCw className="w-4 h-4 text-[#68DBA9]" />
                        <span>Refresh Lists</span>
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#918EA2]">
                    My Task Lists ({filteredLists.length})
                  </h2>
                </div>

                {filteredLists.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#161619] border border-[#1C1C20] flex items-center justify-center mx-auto mb-3 text-[#C5C0FF]">
                      <Layers className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-white">No task lists yet</p>
                    <p className="text-xs text-[#918EA2] mt-1 max-w-xs mx-auto">
                      Create dedicated lists for groceries, work projects, travel packing, or personal goals.
                    </p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleListDragEnd}
                  >
                    <SortableContext
                      items={filteredLists.map((l) => l.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-24">
                        {filteredLists.map((list) => {
                          const stats = listStatsMap.get(list.id) || { total: 0, completed: 0 };
                          return (
                            <ListCard
                              key={list.id}
                              list={list}
                              totalItems={stats.total}
                              completedItems={stats.completed}
                              onClick={() => setSelectedListId(list.id)}
                              onEdit={() => setListToEdit(list)}
                              onDelete={() => setListToDelete(list)}
                              onShowDetails={() => setSelectedListId(list.id)}
                              isSelectionMode={isSelectionMode}
                              isSelected={selectedListIds.has(list.id)}
                              onToggleSelect={() => toggleSelectList(list.id)}
                            />
                          );
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              {/* FAB (+) for creating list */}
              <FloatingActionButton
                hidden={isSelectionMode}
                label="Create list"
                onClick={() => setCreateListOpen(true)}
              />

              {/* Selection Bar for Lists */}
              {isSelectionMode && selectedListIds.size > 0 && (
                <SelectionActionBar
                  selectedCount={selectedListIds.size}
                  onClear={clearSelection}
                  onDelete={() => batchDeleteLists(userCode, Array.from(selectedListIds))}
                />
              )}
            </>
          ) : (
            /* ======================================================== */
            /* SCREEN 2: LIST DETAIL VIEW                                */
            /* ======================================================== */
            <div className="flex-1 flex flex-col">
              {/* Toolbar Header */}
              <div className="sticky top-0 z-30 bg-[#09090B]/90 backdrop-blur-md border-b border-[#1C1C20] py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 truncate">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedListId(null);
                        setIsItemSearchOpen(false);
                        setItemSearchQuery("");
                      }}
                      className="p-1.5 rounded-xl text-[#918EA2] hover:text-white hover:bg-[#161619] transition-colors"
                      title="Back to lists"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div className="w-8 h-8 rounded-xl bg-[#161619] border border-[#1C1C20] flex items-center justify-center text-[#C5C0FF] shrink-0">
                      {renderListIcon(currentList?.iconName || "list", "w-4 h-4")}
                    </div>

                    <div className="truncate">
                      <h2 className="text-base font-bold text-white truncate">
                        {currentList?.name}
                      </h2>
                      <span className="text-[11px] text-[#918EA2]">
                        {currentStats?.completed || 0}/{currentStats?.total || 0} completed
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    {/* Search box (flex-1) */}
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#918EA2] pointer-events-none" />
                      <input
                        type="text"
                        value={itemSearchQuery}
                        onChange={(e) => setItemSearchQuery(e.target.value)}
                        placeholder="Search items in this list..."
                        className="w-full bg-[#111114] border border-[#1C1C20] hover:border-[#474556]/50 focus:border-[#C5C0FF] rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-[#E3E1EC] placeholder-[#918EA2] transition-colors focus:outline-none"
                      />
                      {itemSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setItemSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#918EA2] hover:text-white p-0.5 rounded-full"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Add Multiple Items button */}
                    <button
                      type="button"
                      onClick={() => {
                        setParentForSubtasks(null);
                        setAddMultipleOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#111114] border border-[#1C1C20] text-[#C5C0FF] hover:bg-[#C5C0FF]/10 hover:border-[#C5C0FF]/40 transition-colors shrink-0"
                      title="Add multiple items"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Add Multiple</span>
                    </button>

                    {/* 3-dots Menu */}
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button
                          type="button"
                          className="p-2 rounded-xl bg-[#111114] border border-[#1C1C20] text-[#918EA2] hover:text-white hover:border-[#474556] transition-colors shrink-0"
                          title="More options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenu.Trigger>

                      <DropdownMenu.Portal>
                        <DropdownMenu.Content
                          align="end"
                          sideOffset={6}
                          className="z-50 min-w-[170px] bg-[#1C1C20] border border-[#474556]/40 rounded-xl p-1 shadow-2xl animate-in fade-in-80"
                        >
                          <DropdownMenu.Item
                            onClick={() => {
                              if (isSelectionMode) exitSelectionMode();
                              else enterSelectionMode();
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-xs text-[#E3E1EC] hover:bg-[#252529] hover:text-[#C5C0FF] rounded-lg cursor-pointer outline-none transition-colors"
                          >
                            <CheckSquare className="w-3.5 h-3.5 text-[#C5C0FF]" />
                            <span>{isSelectionMode ? "Exit Selection" : "Select Items"}</span>
                          </DropdownMenu.Item>
                          <DropdownMenu.Item
                            onClick={() => fetchItems(userCode)}
                            className="flex items-center gap-2 px-3 py-2 text-xs text-[#E3E1EC] hover:bg-[#252529] hover:text-[#68DBA9] rounded-lg cursor-pointer outline-none transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-[#68DBA9]" />
                            <span>Refresh Items</span>
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1 bg-[#161619] rounded-full overflow-hidden mt-3">
                  <div
                    className="h-full bg-gradient-to-r from-[#5A45FF] to-[#68DBA9] transition-all duration-300"
                    style={{ width: `${currentPercent}%` }}
                  />
                </div>
              </div>

              {/* Inline Quick Add Item */}
              <form onSubmit={handleQuickAddItem} className="mt-3 mb-4">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={quickItemTitle}
                    onChange={(e) => setQuickItemTitle(e.target.value)}
                    placeholder="Add item... (Press Enter to save)"
                    className="flex-1 bg-[#161619] border border-[#474556]/40 focus:border-[#C5C0FF] rounded-xl px-3.5 py-2.5 text-sm text-[#E3E1EC] placeholder-[#918EA2] focus:outline-none transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!quickItemTitle.trim()}
                    className="p-2.5 rounded-xl bg-[#5A45FF] hover:bg-[#5A45FF]/90 disabled:opacity-40 text-white font-semibold flex items-center justify-center transition-colors"
                    title="Add item"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </form>

              {/* Items Tree */}
              <div className="space-y-2 pb-24">
                {activeRootItems.length === 0 && completedItems.length === 0 ? (
                  <div className="text-center py-12 text-xs text-[#918EA2] italic">
                    No items in this list yet. Type above to add your first item!
                  </div>
                ) : (
                  <>
                    {/* Active items */}
                    <div className="space-y-1.5">
                      {activeRootItems.map((item) => (
                        <ListItemRow
                          key={item.id}
                          item={item}
                          childItems={childrenMap.get(item.id) || []}
                          depth={0}
                          isSelectionMode={isSelectionMode}
                          isSelected={selectedItemIds.has(item.id)}
                          onToggleSelect={() => toggleSelectItem(item.id)}
                          onToggleCompletion={() => toggleItemCompletion(userCode, item.id)}
                          onShowDetails={setItemForDetails}
                          onEditItem={setItemToEdit}
                          onAddSubtasks={(parent) => {
                            setParentForSubtasks(parent);
                            setAddMultipleOpen(true);
                          }}
                          onAdjustParent={setItemForAdjustParent}
                          onDeleteItem={setItemToDelete}
                        />
                      ))}
                    </div>

                    {/* Completed Items Accordion */}
                    {completedItems.length > 0 && (
                      <div className="mt-6 pt-3 border-t border-[#1C1C20]">
                        <button
                          type="button"
                          onClick={toggleCompletedSection}
                          className="w-full flex items-center justify-between py-2 text-xs font-semibold text-[#918EA2] hover:text-[#E3E1EC] uppercase tracking-wider"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#68DBA9]" />
                            <span>Completed ({completedItems.length})</span>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${
                              completedSectionExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {completedSectionExpanded && (
                          <div className="space-y-1.5 mt-2">
                            {completedItems.map((item) => (
                              <ListItemRow
                                key={item.id}
                                item={item}
                                childItems={childrenMap.get(item.id) || []}
                                depth={0}
                                isSelectionMode={isSelectionMode}
                                isSelected={selectedItemIds.has(item.id)}
                                onToggleSelect={() => toggleSelectItem(item.id)}
                                onToggleCompletion={() => toggleItemCompletion(userCode, item.id)}
                                onShowDetails={setItemForDetails}
                                onEditItem={setItemToEdit}
                                onAddSubtasks={(parent) => {
                                  setParentForSubtasks(parent);
                                  setAddMultipleOpen(true);
                                }}
                                onAdjustParent={setItemForAdjustParent}
                                onDeleteItem={setItemToDelete}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Selection Bar for Items */}
              {isSelectionMode && selectedItemIds.size > 0 && (
                <SelectionActionBar
                  selectedCount={selectedItemIds.size}
                  onClear={clearSelection}
                  onComplete={() =>
                    batchCompleteItems(userCode, Array.from(selectedItemIds))
                  }
                  onAdjustParent={() => {
                    const first = currentListItems.find((i) => selectedItemIds.has(i.id)) || null;
                    setItemForAdjustParent(first);
                  }}
                  onDelete={() =>
                    batchDeleteItems(userCode, Array.from(selectedItemIds))
                  }
                />
              )}
            </div>
          )}

          {/* Create / Edit List Dialog */}
          <CreateEditListDialog
            open={createListOpen || !!listToEdit}
            onOpenChange={(open) => {
              if (!open) {
                setCreateListOpen(false);
                setListToEdit(null);
              }
            }}
            listToEdit={listToEdit}
            onSave={async (name, icon) => {
              if (listToEdit) {
                await updateList(userCode, listToEdit.id, name, icon);
              } else {
                await createList(userCode, name, icon);
              }
            }}
          />

          {/* Add Multiple Items / Subtasks Dialog */}
          <AddMultipleItemsDialog
            open={addMultipleOpen}
            onOpenChange={setAddMultipleOpen}
            parentId={parentForSubtasks?.id || null}
            parentTitle={parentForSubtasks?.title || null}
            onAdd={async (titles, pId) => {
              if (selectedListId) {
                await createMultipleItems(userCode, selectedListId, titles, pId);
              }
            }}
          />

          {/* Edit Item Dialog */}
          <EditItemDialog
            open={!!itemToEdit}
            onOpenChange={(open) => !open && setItemToEdit(null)}
            item={itemToEdit}
            onSave={async (patch) => {
              if (itemToEdit) {
                await updateItem(userCode, itemToEdit.id, patch);
              }
            }}
          />

          {/* Item Details Dialog */}
          <ItemDetailsDialog
            open={!!itemForDetails}
            onOpenChange={(open) => !open && setItemForDetails(null)}
            item={itemForDetails}
          />

          {/* Adjust Item Parent Dialog */}
          <AdjustItemParentDialog
            open={!!itemForAdjustParent}
            onOpenChange={(open) => !open && setItemForAdjustParent(null)}
            item={itemForAdjustParent}
            allItemsInList={currentListItems}
            onConfirm={async (newParentId, moveChildren) => {
              if (isSelectionMode && selectedItemIds.size > 1) {
                await batchAdjustItemParent(userCode, Array.from(selectedItemIds), newParentId);
              } else if (itemForAdjustParent) {
                await adjustItemParent(userCode, itemForAdjustParent.id, newParentId, moveChildren);
              }
            }}
          />

          {/* Delete Item Dialog */}
          <DeleteItemDialog
            open={!!itemToDelete}
            onOpenChange={(open) => !open && setItemToDelete(null)}
            item={itemToDelete}
            hasChildren={itemToDelete ? childrenMap.has(itemToDelete.id) : false}
            onConfirm={async (cascade) => {
              if (itemToDelete) {
                await deleteItem(userCode, itemToDelete.id, cascade);
              }
            }}
          />
        </div>
      )}
    </AppShell>
  );
}
