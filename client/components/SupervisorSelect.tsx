import { useSupervisors } from '@/hooks/useSupervisors';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, User, RefreshCw } from 'lucide-react';

interface SupervisorSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}

export default function SupervisorSelect({
  value,
  onValueChange,
  required = false,
  disabled = false
}: SupervisorSelectProps) {
  const { supervisors, loading, error } = useSupervisors();

  // Convert empty string to "none" for display, and "none" back to empty string for the callback
  const displayValue = value === '' ? 'none' : value;
  const handleValueChange = (newValue: string) => {
    onValueChange(newValue === 'none' ? '' : newValue);
  };

  if (error) {
    return (
      <div className="space-y-2">
        <Label htmlFor="supervisor">Superviseur {required && <span className="text-red-500">*</span>}</Label>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error.includes('offline') || error.includes('network') ? (
              <>
                Problème de connexion réseau. Les superviseurs seront chargés automatiquement
                lorsque la connexion sera rétablie.
              </>
            ) : (
              <>Erreur lors du chargement des superviseurs: {error}</>
            )}
          </AlertDescription>
        </Alert>
        {/* Still show the select dropdown even if there's an error */}
        <Select
          value={displayValue}
          onValueChange={handleValueChange}
          disabled={disabled || loading}
        >
          <SelectTrigger id="supervisor">
            <SelectValue placeholder="Superviseurs non disponibles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="text-gray-500">Aucun superviseur (connexion requise)</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="supervisor">
        <User className="inline mr-1 h-4 w-4" />
        Superviseur {required && <span className="text-red-500">*</span>}
      </Label>
      <Select
        value={displayValue}
        onValueChange={handleValueChange}
        disabled={disabled || loading}
      >
        <SelectTrigger id="supervisor">
          <SelectValue 
            placeholder={
              loading 
                ? "Chargement des superviseurs..." 
                : supervisors.length === 0
                  ? "Aucun superviseur disponible"
                  : "Sélectionner un superviseur"
            } 
          />
        </SelectTrigger>
        <SelectContent>
          {!required && (
            <SelectItem value="none">
              <span className="text-gray-500">Aucun superviseur</span>
            </SelectItem>
          )}
          {supervisors.map((supervisor) => (
            <SelectItem key={supervisor.id} value={supervisor.id}>
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-400" />
                <span>
                  {supervisor.nom}
                  {supervisor.company && (
                    <span className="text-gray-500"> ({supervisor.company})</span>
                  )}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {supervisors.length === 0 && !loading && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Aucun superviseur actif trouvé. Les superviseurs sont globaux et apparaissent sur toutes les fermes.
            Vous pouvez créer des superviseurs dans le panneau d'administration.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
