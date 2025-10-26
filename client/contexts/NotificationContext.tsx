import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  deleteDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface InAppNotification {
  id: string;
  type: 'worker_duplicate' | 'worker_exit_request' | 'worker_exit_confirmed' | 'worker_moved_from_farm' | 'worker_transfer_confirmed' | 'worker_transfer_rejected' | 'worker_transfer_delivered' | 'worker_request_rejected' | 'security_code_shared' | 'general' | 'announcement';
  title: string;
  message: string;
  recipientId: string;
  recipientFermeId: string;
  status: 'unread' | 'read' | 'acknowledged';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: any;
  readAt?: any;
  acknowledgedAt?: any;
  createdBy?: string;
  createdByName?: string;
  actionData?: {
    workerId?: string;
    workerName?: string;
    workerCin?: string;
    requesterFermeId?: string;
    requesterFermeName?: string;
    actionRequired?: string;
    actionUrl?: string;
    // Allow additional transfer-specific fields
    [key: string]: any;
  };
}

interface NotificationContextType {
  notifications: InAppNotification[];
  unreadCount: number;
  loading: boolean;
  connectionError: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAsAcknowledged: (notificationId: string) => Promise<void>;
  dismissNotification: (notificationId: string) => Promise<void>;
  deleteAllNotificationsByFarm: (fermeId: string) => Promise<void>;
  sendNotification: (notification: Omit<InAppNotification, 'id' | 'createdAt'>) => Promise<string | null>;
  sendWorkerMovedNotificationToPreviousFarm: (workerData: { id: string; nom: string; cin: string; previousFermeId: string; newFermeId: string; newFermeName: string }, fermes: any[], users: any[]) => Promise<void>;
  broadcastAnnouncement: (title: string, message: string, targetAudience: 'all' | 'users' | 'admins', priority: 'low' | 'medium' | 'high' | 'urgent') => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Load notifications for current user
  useEffect(() => {
    if (!user?.uid) {
      console.log('❌ No user UID, skipping notification setup');
      setNotifications([]);
      setLoading(false);
      return;
    }

    console.log('🔄 Setting up notifications for user:', user.uid, 'Email:', user.email);

    // Use simple query without orderBy to avoid index requirement
    // Sort in memory instead
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const notificationsData = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          } as InAppNotification))
          .sort((a, b) => {
            // Sort in memory by createdAt descending
            const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
            const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
            return bTime.getTime() - aTime.getTime();
          });

        console.log('✅ Loaded notifications:', notificationsData.length);
        if (notificationsData.length > 0) {
          console.log('📝 Notification details:', notificationsData);
        }
        setNotifications(notificationsData);
        setConnectionError(null); // Clear any previous connection errors
        setLoading(false);
      },
      (error) => {
        console.error('❌ Error loading notifications:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);

        if (error.code === 'permission-denied') {
          console.error('🚫 PERMISSION DENIED: Firestore rules are blocking notification access');
          console.error('💡 Solution: Deploy updated Firestore rules or check user authentication');
          setConnectionError('Permission denied - check Firebase configuration');
        } else if (error.code === 'unavailable') {
          console.error('🌐 FIRESTORE UNAVAILABLE: Network or service issue');
          console.error('📋 The app will continue in offline mode until connection is restored');
          setConnectionError('Firebase is temporarily unavailable. Operating in offline mode.');
          setNotifications([]);
        } else if (error.message?.includes('Failed to fetch') || error.message?.includes('fetch')) {
          console.error('🌐 NETWORK ERROR: Failed to fetch from Firebase backend');
          console.error('📋 This usually resolves automatically. The app will retry connection.');
          setConnectionError('Network connection issue. Notifications may be delayed.');
          setNotifications([]);
        } else {
          setConnectionError(`Firebase error: ${error.message || 'Unknown error'}`);
        }

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  const markAsRead = async (notificationId: string) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        status: 'read',
        readAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAsAcknowledged = async (notificationId: string) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        status: 'acknowledged',
        acknowledgedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error acknowledging notification:', error);
    }
  };

  const dismissNotification = async (notificationId: string) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await deleteDoc(notificationRef);
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const deleteAllNotificationsByFarm = async (fermeId: string) => {
    if (!user?.uid) {
      console.error('No authenticated user for deleting notifications');
      return;
    }

    try {
      console.log(`🗑️ Deleting all notifications related to farm: ${fermeId}`);

      // Query for all notifications where the recipient is the current user
      // and the notification is related to the specified farm
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('recipientId', '==', user.uid)
      );

      const snapshot = await getDocs(notificationsQuery);
      const batch = writeBatch(db);
      let deleteCount = 0;

      snapshot.docs.forEach((docSnapshot) => {
        const notification = docSnapshot.data() as InAppNotification;

        // Delete notifications related to this farm
        if (notification.recipientFermeId === fermeId ||
            notification.actionData?.requesterFermeId === fermeId ||
            notification.actionData?.workerId) {
          batch.delete(doc(db, 'notifications', docSnapshot.id));
          deleteCount++;
        }
      });

      if (deleteCount > 0) {
        await batch.commit();
        console.log(`✅ Successfully deleted ${deleteCount} notifications related to farm ${fermeId}`);
      } else {
        console.log(`ℹ️ No notifications found to delete for farm ${fermeId}`);
      }
    } catch (error) {
      console.error('Error deleting notifications by farm:', error);
      throw error;
    }
  };

  const broadcastAnnouncement = async (
    title: string,
    message: string,
    targetAudience: 'all' | 'users' | 'admins',
    priority: 'low' | 'medium' | 'high' | 'urgent'
  ) => {
    if (!user?.uid) {
      console.error('❌ No authenticated user - cannot send announcement');
      return;
    }

    try {
      console.log('🔄 Broadcasting announcement to:', targetAudience);

      // Get all users to send notifications to
      const usersQuery = collection(db, 'users');
      const usersSnapshot = await getDocs(usersQuery);

      const batch = writeBatch(db);
      let notificationCount = 0;

      usersSnapshot.docs.forEach((userDoc) => {
        const userData = userDoc.data();
        const userId = userDoc.id;

        // Skip sending notification to the sender themselves
        if (userId === user.uid) {
          return;
        }

        // Filter recipients based on target audience
        let shouldSendToUser = false;

        if (targetAudience === 'all') {
          shouldSendToUser = true;
        } else if (targetAudience === 'users' && userData.role === 'user') {
          shouldSendToUser = true;
        } else if (targetAudience === 'admins' && (userData.role === 'admin' || userData.role === 'superadmin')) {
          shouldSendToUser = true;
        }

        if (shouldSendToUser) {
          const notificationRef = doc(collection(db, 'notifications'));
          const notificationData = {
            type: 'announcement' as const,
            title,
            message,
            recipientId: userId,
            recipientFermeId: userData.fermeId || '',
            status: 'unread' as const,
            priority,
            createdAt: serverTimestamp(),
            createdBy: user.uid,
            createdByName: user.nom || user.email
          };

          batch.set(notificationRef, notificationData);
          notificationCount++;
        }
      });

      if (notificationCount > 0) {
        await batch.commit();
        console.log(`✅ Announcement sent to ${notificationCount} users`);
      } else {
        console.log('ℹ️ No users found matching the target audience');
      }
    } catch (error) {
      console.error('❌ Error broadcasting announcement:', error);
      throw error;
    }
  };

  const sendNotification = async (notificationData: Omit<InAppNotification, 'id' | 'createdAt'>) => {
    console.log('🔄 Attempting to send notification:', {
      type: notificationData.type,
      title: notificationData.title,
      recipientId: notificationData.recipientId,
      priority: notificationData.priority
    });

    // Additional check: Don't send certain notifications to superadmin users
    if (notificationData.type === 'worker_duplicate') {
      // Check if recipient is superadmin (this should already be filtered, but double-check)
      // Note: This requires access to users collection, but we'll rely on the filtering in Workers.tsx
      console.log('📧 Sending worker duplicate notification (superadmin filtering applied in Workers.tsx)');
    }

    // Retry logic for network failures
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check if we're online
        if (!navigator.onLine) {
          console.warn('⚠️ Offline - notification will be sent when connection is restored');
          return null;
        }

        // Check if user is authenticated
        if (!user?.uid) {
          console.error('❌ No authenticated user - cannot send notification');
          return null;
        }

        const notificationDoc = {
          ...notificationData,
          createdAt: serverTimestamp()
        };

        console.log(`📤 Sending notification document to Firestore (attempt ${attempt}):`, notificationDoc);

        const docRef = await addDoc(collection(db, 'notifications'), notificationDoc);

        console.log('✅ Notification sent successfully with ID:', docRef.id);
        return docRef.id;
      } catch (error: any) {
        console.error(`❌ Error sending notification (attempt ${attempt}):`, error);
        console.error('Error code:', error?.code);
        console.error('Error message:', error?.message);

        // Handle specific error types
        if (error?.code === 'permission-denied') {
          console.error('🚫 Permission denied - check Firestore rules for notifications collection');
          console.log('💡 Suggestion: Deploy Firestore rules or check user permissions');
          break; // Don't retry permission errors
        } else if (error?.code === 'unavailable' || error?.message?.includes('Failed to fetch')) {
          console.error('🌐 Firestore unavailable - network connection issue');

          if (attempt < maxRetries) {
            console.log(`⏳ Retrying in ${retryDelay}ms... (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
            continue; // Retry
          }
        } else if (error?.code === 'failed-precondition') {
          console.error('⚙️ Firestore rules or index issue');
          break; // Don't retry configuration errors
        }

        // If this is the last attempt, log final failure
        if (attempt === maxRetries) {
          console.error(`💥 All ${maxRetries} attempts failed. Notification could not be sent.`);
        }
      }
    }

    // Don't throw the error to prevent breaking the UI
    // The notification will fail silently but the main operation continues
    return null;
  };

  const sendWorkerMovedNotificationToPreviousFarm = async (
    workerData: {
      id: string;
      nom: string;
      cin: string;
      previousFermeId: string;
      newFermeId: string;
      newFermeName: string;
    },
    fermes: any[],
    users: any[]
  ) => {
    if (!user?.uid) {
      console.error('❌ No authenticated user - cannot send worker moved notification');
      return;
    }

    try {
      console.log('🔄 Sending worker moved notification to previous farm:', {
        workerName: workerData.nom,
        workerCin: workerData.cin,
        previousFermeId: workerData.previousFermeId,
        newFermeName: workerData.newFermeName
      });

      // Find the previous farm
      const previousFarm = fermes.find(f => f.id === workerData.previousFermeId);
      if (!previousFarm) {
        console.log('⚠️ Previous farm not found:', workerData.previousFermeId);
        return;
      }

      // Get admin IDs for the previous farm, excluding superadmins and current user
      const validAdmins = (previousFarm.admins || []).filter((adminId: string) => {
        // Exclude the current user
        if (adminId === user.uid) return false;

        // Find the admin user and exclude superadmins
        const adminUser = users?.find(u => u.uid === adminId);
        if (adminUser?.role === 'superadmin') {
          console.log(`🚫 Skipping superadmin: ${adminId} (${adminUser.email})`);
          return false;
        }

        return true;
      });

      if (validAdmins.length === 0) {
        console.log('⚠️ No valid admins found for previous farm:', previousFarm.nom);
        return;
      }

      console.log(`📤 Sending notifications to ${validAdmins.length} admin(s) of ${previousFarm.nom}`);

      // Send notification to each admin of the previous farm
      for (const adminId of validAdmins) {
        try {
          await sendNotification({
            type: 'worker_moved_from_farm',
            title: '👤 Ouvrier transféré vers une autre ferme',
            message: `L'ouvrier ${workerData.nom} (CIN: ${workerData.cin}) qui était dans votre ferme "${previousFarm.nom}" a été enregistré dans la ferme "${workerData.newFermeName}". Veuillez vérifier son statut et ajouter une date de sortie si nécessaire.`,
            recipientId: adminId,
            recipientFermeId: workerData.previousFermeId,
            status: 'unread',
            priority: 'high',
            createdBy: user.uid,
            createdByName: user.nom || user.email,
            actionData: {
              workerId: workerData.id,
              workerName: workerData.nom,
              workerCin: workerData.cin,
              requesterFermeId: workerData.newFermeId,
              requesterFermeName: workerData.newFermeName,
              actionRequired: 'Vérifier le statut de l\'ouvrier et ajouter une date de sortie si nécessaire',
              actionUrl: `/workers?search=${workerData.cin}`
            }
          });
          console.log(`✅ Worker moved notification sent to admin ${adminId} of ${previousFarm.nom}`);
        } catch (notificationError) {
          console.error(`❌ Failed to send worker moved notification to admin ${adminId}:`, notificationError);
        }
      }
    } catch (error) {
      console.error('❌ Error sending worker moved notification to previous farm:', error);
    }
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    connectionError,
    markAsRead,
    markAsAcknowledged,
    dismissNotification,
    deleteAllNotificationsByFarm,
    sendNotification,
    sendWorkerMovedNotificationToPreviousFarm,
    broadcastAnnouncement
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
