import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArticleName } from '@shared/types';

interface ArticleComboboxProps {
  value?: string;
  onValueChange?: (value: string) => void;
  onUnitChange?: (unit: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  required?: boolean;
  allowCustomEntry?: boolean;
}

export default function ArticleCombobox({
  value = '',
  onValueChange,
  onUnitChange,
  placeholder = 'Sélectionner un article...',
  emptyMessage = 'Aucun article trouvé.',
  className,
  required = false,
  allowCustomEntry = false
}: ArticleComboboxProps) {
  const { user, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [articleNames, setArticleNames] = useState<ArticleName[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');

  // Load predefined article names
  useEffect(() => {
    const articleNamesQuery = query(
      collection(db, 'article_names'),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(
      articleNamesQuery,
      (snapshot) => {
        const articleNamesData: ArticleName[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ArticleName));
        // Sort by name on the client side
        articleNamesData.sort((a, b) => a.name.localeCompare(b.name));
        setArticleNames(articleNamesData);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading article names:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les noms d'articles prédéfinis",
          variant: "destructive"
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filter articles based on search
  const filteredArticles = articleNames.filter(article =>
    article.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleSelect = (selectedArticle: ArticleName) => {
    console.log('handleSelect called with:', selectedArticle);
    onValueChange?.(selectedArticle.name);
    onUnitChange?.(selectedArticle.defaultUnit);
    setOpen(false);
    setSearchValue('');
    setShowCustomInput(false);
  };

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onValueChange?.(customValue.trim());
      setCustomValue('');
      setShowCustomInput(false);
      setOpen(false);
      setSearchValue('');
    }
  };

  const handleCustomCancel = () => {
    setCustomValue('');
    setShowCustomInput(false);
    setSearchValue('');
  };

  // If there are no predefined articles and custom entry is not allowed, show message
  if (!loading && articleNames.length === 0 && !allowCustomEntry) {
    return (
      <div>
        <Label>Article {required && '*'}</Label>
        <div className="text-sm text-gray-500 p-3 border border-gray-200 rounded-md bg-gray-50">
          Aucun nom d'article prédéfini disponible. Contactez un superadministrateur pour ajouter des noms d'articles.
        </div>
      </div>
    );
  }

  if (showCustomInput) {
    return (
      <div>
        <Label>Article {required && '*'}</Label>
        <div className="space-y-2">
          <Input
            placeholder="Entrer le nom de l'article..."
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCustomSubmit();
              }
            }}
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCustomSubmit} disabled={!customValue.trim()}>
              Ajouter
            </Button>
            <Button size="sm" variant="outline" onClick={handleCustomCancel}>
              Annuler
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Label>Article {required && '*'}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between", className)}
          >
            {value || placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[300px] p-0">
          <Command>
            <CommandInput 
              placeholder="Rechercher un article..." 
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>
                <div className="p-4 text-center">
                  <p className="text-sm text-gray-500 mb-3">{emptyMessage}</p>
                  {allowCustomEntry && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowCustomInput(true);
                        setOpen(false);
                      }}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter un article personnalisé
                    </Button>
                  )}
                </div>
              </CommandEmpty>
              
              {!loading && (
                <CommandGroup>
                  {filteredArticles.map((article) => (
                    <CommandItem
                      key={article.id}
                      value={article.name}
                      className="cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      style={{ pointerEvents: 'auto' }}
                      onSelect={(value) => {
                        console.log('Article selected:', value, article);
                        const selectedArticle = filteredArticles.find(a => a.name === value);
                        if (selectedArticle) {
                          handleSelect(selectedArticle);
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        console.log('Article mousedown:', article);
                        handleSelect(article);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === article.name ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{article.name}</div>
                        <div className="text-xs text-gray-500">
                          Unité: {article.defaultUnit}
                          {article.description && ` • ${article.description}`}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                  
                  {allowCustomEntry && filteredArticles.length > 0 && (
                    <div className="border-t pt-2">
                      <CommandItem
                        value="__custom__"
                        onSelect={(value) => {
                          if (value === "__custom__") {
                            setShowCustomInput(true);
                            setOpen(false);
                          }
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter un article personnalisé
                      </CommandItem>
                    </div>
                  )}
                </CommandGroup>
              )}
              
              {loading && (
                <div className="p-4 text-center text-sm text-gray-500">
                  Chargement des articles...
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
