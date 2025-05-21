import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowDownUp, Clock, RefreshCw, AlertTriangle, Check, Play, Pause, Info } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { EntityType, SyncOperation } from '@/lib/sync/types';
import { supabase } from '@/integrations/supabase/client';

interface SyncTaskRecord {
  id: string;
  task: string;
  entity_type: string;
  entity_id: string;
  parent_task: string | null;
  priority: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  error: string | null;
}

interface SyncOrchestratorPanelProps {
  initialEntityType?: EntityType;
  initialEntityId?: string;
}

export default function SyncOrchestratorPanel({ 
  initialEntityType,
  initialEntityId
}: SyncOrchestratorPanelProps) {
  const [activeTab, setActiveTab] = useState<string>('new');
  const [operations, setOperations] = useState<SyncTaskRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<boolean>(false);
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType | ''>
    (initialEntityType || '');
  const [selectedEntityId, setSelectedEntityId] = useState<string>(initialEntityId || '');
  const [selectedOperation, setSelectedOperation] = useState<SyncOperation>('refresh');
  const [syncInProgress, setSyncInProgress] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  
  // Check if we can render this component safely
  const [isSupabaseAvailable, setIsSupabaseAvailable] = useState<boolean>(true);
  
  // Check supabase connection on mount
  useEffect(() => {
    try {
      // First, check if the supabase client is available
      if (!supabase) {
        console.warn('Supabase client not available');
        setIsSupabaseAvailable(false);
        setConnectionError(true);
        return;
      }
      
      // If we have a client, proceed with connection check
      checkConnection();
    } catch (err) {
      console.error('Error in Supabase initialization:', err);
      setIsSupabaseAvailable(false);
      setConnectionError(true);
    }
  }, []);
  
  async function checkConnection() {
    if (!isSupabaseAvailable) return;
    
    try {
      // Test the connection with a simple query
      const { error } = await supabase.from('artists').select('id').limit(1);
      
      if (error) {
        console.error('Supabase connection error:', error);
        setConnectionError(true);
      } else {
        setConnectionError(false);
        // Only fetch operations if connection is successful
        fetchOperations();
        
        // Setup polling for fresh data
        const interval = setInterval(fetchOperations, 10000);
        return () => clearInterval(interval);
      }
    } catch (err) {
      console.error('Error checking Supabase connection:', err);
      setConnectionError(true);
    }
  }
  
  async function fetchOperations() {
    // Skip if there's a connection error
    if (connectionError || !isSupabaseAvailable) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/sync/orchestrator?limit=50', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      setOperations(data.tasks || []);
    } catch (err) {
      console.error('Failed to fetch operations:', err);
      setError('Failed to load sync operations. Please try again.');
    } finally {
      setLoading(false);
    }
  }
  
  async function startSyncOperation() {
    if (!selectedEntityType || !selectedEntityId) {
      setError('Please select an entity type and provide an ID');
      return;
    }
    
    try {
      setSyncInProgress(true);
      setSyncResult(null);
      setError(null);
      
      const response = await fetch('/api/sync/orchestrator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: {
            type: selectedEntityType,
            id: selectedEntityId,
            operation: selectedOperation,
            priority: 'high',
          },
          dependencyCheck: true,
          retryFailed: true
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }
      
      const result = await response.json();
      setSyncResult(result);
      
      // Refresh operations list
      fetchOperations();
    } catch (err) {
      console.error('Failed to start sync operation:', err);
      setError(err instanceof Error ? err.message : 'Failed to start sync operation');
    } finally {
      setSyncInProgress(false);
    }
  }
  
  function getStatusBadge(status: string) {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock size={14} className="mr-1" /> Pending</Badge>;
      case 'started':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><RefreshCw size={14} className="mr-1 animate-spin" /> Running</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><Check size={14} className="mr-1" /> Completed</Badge>;
      case 'completed_with_errors':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200"><AlertTriangle size={14} className="mr-1" /> Partial</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><AlertTriangle size={14} className="mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }
  
  function formatDate(dateString: string | null) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);
  }
  
  function formatDuration(start: string, end: string | null) {
    if (!end) return 'In progress';
    
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const durationMs = endTime - startTime;
    
    if (durationMs < 1000) {
      return `${durationMs}ms`;
    } else if (durationMs < 60000) {
      return `${Math.round(durationMs / 1000)}s`;
    } else {
      const minutes = Math.floor(durationMs / 60000);
      const seconds = Math.round((durationMs % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  }
  
  const entityTypeOptions: Array<{ value: EntityType | ''; label: string }> = [
    { value: '', label: 'Select Type' },
    { value: 'artist', label: 'Artist' },
    { value: 'show', label: 'Show/Concert' },
    { value: 'venue', label: 'Venue' },
    { value: 'setlist', label: 'Setlist' },
    { value: 'song', label: 'Song' }
  ];
  
  const operationOptions: Array<{ value: SyncOperation; label: string }> = [
    { value: 'refresh', label: 'Refresh Data' },
    { value: 'create', label: 'Create New' },
    { value: 'expand_relations', label: 'Expand Relations' },
    { value: 'cascade_sync', label: 'Cascade Sync' }
  ];
  
  // Render connection error or component
  if (connectionError) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownUp className="h-5 w-5" />
            Data Sync Orchestrator
          </CardTitle>
          <CardDescription>
            Centralized system for data synchronization with dependency management
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Configuration Error</AlertTitle>
            <AlertDescription>
              {!isSupabaseAvailable ? (
                "Supabase client is not properly initialized. Please check your environment variables (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY)."
              ) : (
                "Could not connect to the database. Please check your API connection and credentials."
              )}
            </AlertDescription>
          </Alert>
          
          <div className="mt-4 p-4 bg-muted rounded-md">
            <h3 className="text-sm font-medium mb-2">Troubleshooting Steps:</h3>
            <ul className="text-sm space-y-1 list-disc pl-5">
              <li>Verify your Supabase environment variables are correctly set</li>
              <li>Check if .env.local file exists with the required keys</li>
              <li>Ensure your Supabase project is active and running</li>
              <li>Restart your development server after making changes</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Render the normal component
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowDownUp className="h-5 w-5" />
          Data Sync Orchestrator
        </CardTitle>
        <CardDescription>
          Centralized system for data synchronization with dependency management
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="recent">Recent Operations</TabsTrigger>
            <TabsTrigger value="new">Start New Sync</TabsTrigger>
          </TabsList>
          
          <TabsContent value="recent">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium">Recent Sync Operations</h3>
              <Button variant="outline" size="sm" onClick={fetchOperations} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ScrollArea className="h-[350px]">
                <Table>
                  <TableCaption>List of recent sync operations</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {operations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          No operations found
                        </TableCell>
                      </TableRow>
                    ) : (
                      operations.map((op) => (
                        <TableRow key={op.id}>
                          <TableCell>{getStatusBadge(op.status)}</TableCell>
                          <TableCell className="font-medium">
                            {op.entity_type}
                            <div className="text-xs text-muted-foreground truncate max-w-[100px]">
                              {op.entity_id}
                            </div>
                          </TableCell>
                          <TableCell>{op.task}</TableCell>
                          <TableCell>{formatDate(op.started_at)}</TableCell>
                          <TableCell>
                            {formatDuration(op.started_at, op.completed_at)}
                            {op.error && (
                              <div className="text-xs text-red-500 mt-1 truncate max-w-[150px]" title={op.error}>
                                {op.error}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </TabsContent>
          
          <TabsContent value="new">
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {syncResult && (
                <Alert variant={syncResult.success ? "default" : "destructive"} className={syncResult.success ? "bg-green-50 border-green-200" : undefined}>
                  <Check className="h-4 w-4" />
                  <AlertTitle>{syncResult.success ? "Success" : "Completed with issues"}</AlertTitle>
                  <AlertDescription>
                    {syncResult.message}
                    {syncResult.taskId && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Task ID: {syncResult.taskId}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Entity Type</label>
                  <select 
                    value={selectedEntityType}
                    onChange={(e) => setSelectedEntityType(e.target.value as EntityType | '')}
                    className="w-full p-2 border rounded-md text-sm"
                    disabled={syncInProgress}
                  >
                    {entityTypeOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Entity ID</label>
                  <input 
                    type="text"
                    value={selectedEntityId}
                    onChange={(e) => setSelectedEntityId(e.target.value)}
                    placeholder="Enter ID"
                    className="w-full p-2 border rounded-md text-sm"
                    disabled={syncInProgress}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Operation</label>
                  <select 
                    value={selectedOperation}
                    onChange={(e) => setSelectedOperation(e.target.value as SyncOperation)}
                    className="w-full p-2 border rounded-md text-sm"
                    disabled={syncInProgress}
                  >
                    {operationOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <Alert className="bg-blue-50 border-blue-200">
                <AlertTitle className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  About this operation
                </AlertTitle>
                <AlertDescription className="text-sm">
                  {selectedOperation === 'refresh' && (
                    <>Refresh will update the selected entity with the latest data from external APIs.</>
                  )}
                  {selectedOperation === 'create' && (
                    <>Create will add a new entity using the provided ID. For artists, this should be the name or Ticketmaster ID.</>
                  )}
                  {selectedOperation === 'expand_relations' && (
                    <>Expand Relations will sync all connected entities (e.g., for a show: venue, artist, and setlist).</>
                  )}
                  {selectedOperation === 'cascade_sync' && (
                    <>Cascade Sync will recursively sync the entity and all its related entities in the proper order.</>
                  )}
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className={`${activeTab === 'new' ? 'block' : 'hidden'}`}>
        <Button 
          className="w-full" 
          onClick={startSyncOperation}
          disabled={syncInProgress || !selectedEntityType || !selectedEntityId}
        >
          {syncInProgress ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Start Sync Operation
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 