import { SyncTask } from './types';
import { SyncManager } from './manager';

/**
 * Priority-based queue system for processing sync tasks
 * Handles task scheduling and execution with prioritization
 */
export class SyncQueue {
  private highPriorityQueue: SyncTask[] = [];
  private mediumPriorityQueue: SyncTask[] = [];
  private lowPriorityQueue: SyncTask[] = [];
  private isProcessing = false;
  
  constructor(private syncManager: SyncManager) {}
  
  /**
   * Add a new task to the appropriate priority queue
   */
  add(task: SyncTask) {
    // Set default attempts if not specified
    const finalTask = { ...task, attempts: task.attempts || 0 };
    
    // Add to appropriate queue based on priority
    switch(finalTask.priority) {
      case 'high': 
        this.highPriorityQueue.push(finalTask); 
        break;
      case 'medium': 
        this.mediumPriorityQueue.push(finalTask); 
        break;
      case 'low': 
        this.lowPriorityQueue.push(finalTask); 
        break;
    }
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }
  
  /**
   * Process all queued tasks in priority order
   */
  private async processQueue() {
    this.isProcessing = true;
    
    try {
      while (
        this.highPriorityQueue.length > 0 ||
        this.mediumPriorityQueue.length > 0 ||
        this.lowPriorityQueue.length > 0
      ) {
        // Process tasks in priority order
        const nextTask = this.highPriorityQueue.shift() || 
                        this.mediumPriorityQueue.shift() ||
                        this.lowPriorityQueue.shift();
                        
        if (nextTask) {
          await this.processTask(nextTask);
        }
      }
    } catch (error) {
      console.error('Error processing sync queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Process an individual task and handle errors with retries
   */
  private async processTask(task: SyncTask) {
    try {
      console.log(`Processing ${task.operation} task for ${task.type} ${task.id}`);
      
      switch(task.operation) {
        case 'create': 
          await this.syncManager.createSingle(task.type, task.id);
          break;
        case 'refresh': 
          await this.syncManager.refreshSingle(task.type, task.id);
          break;
        case 'expand_relations':
          await this.syncManager.expandRelations(task.type, task.id);
          break;
        case 'cascade_sync':
          if (task.type === 'venue') {
            await this.syncManager.venueCascadeSync(task.id);
          } else if (task.type === 'artist') {
            await this.syncManager.artistCascadeSync(task.id);
          }
          break;
      }
    } catch (error) {
      console.error(`Error processing task:`, task, error);
      
      // Add retry logic with exponential backoff
      if (task.attempts < 3) {
        const delayMs = Math.pow(2, task.attempts) * 1000; // Exponential backoff
        console.log(`Retrying task in ${delayMs}ms...`);
        
        setTimeout(() => {
          this.add({
            ...task, 
            attempts: task.attempts + 1, 
            priority: 'low' // Downgrade priority on retries
          });
        }, delayMs);
      } else {
        console.error(`Giving up on task after ${task.attempts} attempts:`, task);
      }
    }
  }
  
  /**
   * Get the current queue status
   */
  getStatus() {
    return {
      highPriority: this.highPriorityQueue.length,
      mediumPriority: this.mediumPriorityQueue.length,
      lowPriority: this.lowPriorityQueue.length,
      isProcessing: this.isProcessing
    };
  }
} 