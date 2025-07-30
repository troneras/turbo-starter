import { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Plus, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { TranslationKeyTreeNode } from '@cms/contracts/types/translations';

interface TreeNodeData extends TranslationKeyTreeNode {
  children?: TreeNodeData[];
  isLoading?: boolean;
  isLoaded?: boolean;
}

interface TranslationKeyTreeProps {
  onSelectKey: (key: string) => void;
  onCreateKey?: (parentPath: string) => void;
  onDeleteKey?: (key: string) => void;
  selectedKey?: string;
  loadChildren: (parentPath: string) => Promise<TranslationKeyTreeNode[]>;
}

interface TreeNodeProps {
  node: TreeNodeData;
  level: number;
  onSelectKey: (key: string) => void;
  onCreateKey?: (parentPath: string) => void;
  onDeleteKey?: (key: string) => void;
  selectedKey?: string;
  onToggle: (node: TreeNodeData) => void;
}

function TreeNode({
  node,
  level,
  onSelectKey,
  onCreateKey,
  onDeleteKey,
  selectedKey,
  onToggle,
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    if (node.isFolder) {
      setIsExpanded(!isExpanded);
      onToggle(node);
    }
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectKey(node.fullPath);
  };

  const isSelected = selectedKey === node.fullPath;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 px-2 py-1 hover:bg-muted rounded-sm cursor-pointer",
          isSelected && "bg-muted"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleToggle}
      >
        {node.isFolder ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0"
            onClick={handleToggle}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        ) : (
          <div className="w-4" />
        )}

        {node.isFolder ? (
          isExpanded ? (
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground" />
          )
        ) : (
          <File className="h-4 w-4 text-muted-foreground" />
        )}

        <span
          className="flex-1 text-sm truncate"
          onClick={handleSelect}
        >
          {node.segment}
        </span>

        {node.isFolder && node.childCount > 0 && (
          <span className="text-xs text-muted-foreground">
            ({node.childCount})
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {node.isFolder && onCreateKey && (
              <>
                <DropdownMenuItem onClick={() => onCreateKey(node.fullPath)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Key
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {onDeleteKey && (
              <DropdownMenuItem
                onClick={() => onDeleteKey(node.fullPath)}
                className="text-destructive"
              >
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isExpanded && node.children && (
        <div>
          {node.isLoading ? (
            <div
              className="text-xs text-muted-foreground"
              style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}
            >
              Loading...
            </div>
          ) : (
            node.children.map((child) => (
              <TreeNode
                key={child.fullPath}
                node={child}
                level={level + 1}
                onSelectKey={onSelectKey}
                onCreateKey={onCreateKey}
                onDeleteKey={onDeleteKey}
                selectedKey={selectedKey}
                onToggle={onToggle}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function TranslationKeyTree({
  onSelectKey,
  onCreateKey,
  onDeleteKey,
  selectedKey,
  loadChildren,
}: TranslationKeyTreeProps) {
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [isLoadingRoot, setIsLoadingRoot] = useState(true);

  // Load root nodes on mount
  useState(() => {
    loadChildren('').then((nodes) => {
      setTreeData(nodes.map(n => ({ ...n, children: [], isLoaded: false })));
      setIsLoadingRoot(false);
    });
  });

  const handleToggle = useCallback(async (node: TreeNodeData) => {
    if (!node.isFolder || node.isLoaded) return;

    // Mark as loading
    const updateNodeLoading = (nodes: TreeNodeData[]): TreeNodeData[] => {
      return nodes.map(n => {
        if (n.fullPath === node.fullPath) {
          return { ...n, isLoading: true };
        }
        if (n.children) {
          return { ...n, children: updateNodeLoading(n.children) };
        }
        return n;
      });
    };

    setTreeData(updateNodeLoading(treeData));

    try {
      // Load children
      const children = await loadChildren(node.fullPath);

      // Update tree with loaded children
      const updateNodeChildren = (nodes: TreeNodeData[]): TreeNodeData[] => {
        return nodes.map(n => {
          if (n.fullPath === node.fullPath) {
            return {
              ...n,
              isLoading: false,
              isLoaded: true,
              children: children.map(c => ({ ...c, children: [], isLoaded: false }))
            };
          }
          if (n.children) {
            return { ...n, children: updateNodeChildren(n.children) };
          }
          return n;
        });
      };

      setTreeData(updateNodeChildren(treeData));
    } catch (error) {
      // Handle error - remove loading state
      const updateNodeError = (nodes: TreeNodeData[]): TreeNodeData[] => {
        return nodes.map(n => {
          if (n.fullPath === node.fullPath) {
            return { ...n, isLoading: false };
          }
          if (n.children) {
            return { ...n, children: updateNodeError(n.children) };
          }
          return n;
        });
      };

      setTreeData(updateNodeError(treeData));
    }
  }, [treeData, loadChildren]);

  if (isLoadingRoot) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Loading translation keys...
      </div>
    );
  }

  if (treeData.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-muted-foreground mb-2">
          No translation keys found
        </p>
        {onCreateKey && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCreateKey('')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create First Key
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="py-2">
      {treeData.map((node) => (
        <TreeNode
          key={node.fullPath}
          node={node}
          level={0}
          onSelectKey={onSelectKey}
          onCreateKey={onCreateKey}
          onDeleteKey={onDeleteKey}
          selectedKey={selectedKey}
          onToggle={handleToggle}
        />
      ))}
    </div>
  );
}