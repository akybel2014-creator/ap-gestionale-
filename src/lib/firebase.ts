import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { Project, ActivityLogEntry } from '@/types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
];

SCOPES.forEach((scope) => {
  googleProvider.addScope(scope);
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot (skip during SSR)
async function testConnection() {
  if (typeof window === 'undefined') return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      // Offline mode or local development without cloud backend
      console.info('Firebase operating in local/offline storage mode.');
    }
  }
}
void testConnection();

export async function signInWithGoogleCloud() {
  return signInWithPopup(auth, googleProvider);
}

export async function signOutCloud() {
  return signOut(auth);
}

function sanitizeFirestoreId(rawId: string): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  return cleaned || `id-${Date.now()}`;
}

const AUTHORIZED_CLOUD_ADMIN_EMAIL = 'bellosi2022@gmail.com';

/**
 * Verifies that the currently authenticated Firebase user has a validated identity relationship
 * with the active application user before permitting any cross-account or cloud synchronization.
 */
export function isCloudIdentityVerifiedForAppUser(
  activeUserId: string,
  activeUserEmail?: string | null,
): boolean {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified || !currentUser.email) {
    return false;
  }
  const fbEmail = currentUser.email.trim().toLowerCase();

  // Admin workspace ('admin-it') may only sync if Firebase user is the verified admin email
  if (activeUserId === 'admin-it') {
    return fbEmail === AUTHORIZED_CLOUD_ADMIN_EMAIL;
  }

  // Ordinary customer accounts may only sync if their verified application email matches their verified Firebase email,
  // or if activeUserId is directly their Firebase UID
  if (activeUserId === currentUser.uid) {
    return true;
  }

  if (activeUserEmail && activeUserEmail.trim().toLowerCase() === fbEmail) {
    return true;
  }

  return false;
}

export async function syncProjectToFirestore(
  project: Project,
  activeUserId: string,
  activeUserEmail?: string | null,
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !isCloudIdentityVerifiedForAppUser(activeUserId, activeUserEmail)) return;
  if ((project.userId || 'admin-it') !== activeUserId) return;

  const projectId = sanitizeFirestoreId(project.id);
  const path = `projects/${projectId}`;
  const safeName = project.name.trim().slice(0, 60);
  const finalName = safeName.length >= 2 ? safeName : `${safeName}01`;
  const safeDescription = (project.description.trim() || 'Progetto AI App Builder').slice(0, 2000);
  const safeCodeVersion = (project.codeVersion || 'v1.0').slice(0, 64);

  const payload: Record<string, unknown> = {
    id: projectId,
    ownerUid: currentUser.uid,
    userId: sanitizeFirestoreId(project.userId || activeUserId),
    name: finalName,
    description: safeDescription,
    type: project.type || 'website',
    status: project.status || 'draft',
    codeVersion: safeCodeVersion,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (typeof project.previewHtml === 'string' && project.previewHtml.length > 0) {
    payload.previewHtml = project.previewHtml.slice(0, 250000);
  }

  try {
    await setDoc(doc(db, 'projects', projectId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateProjectInFirestore(
  project: Project,
  updates: Partial<Project>,
  activeUserId: string = 'admin-it',
  activeUserEmail?: string | null,
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !isCloudIdentityVerifiedForAppUser(activeUserId, activeUserEmail)) return;
  if ((project.userId || 'admin-it') !== activeUserId) return;

  const projectId = sanitizeFirestoreId(project.id);
  const path = `projects/${projectId}`;
  const updatePayload: Record<string, unknown> = {
    name: (updates.name ?? project.name).trim().slice(0, 60),
    description: ((updates.description ?? project.description).trim() || 'Progetto').slice(0, 2000),
    type: updates.type ?? project.type,
    status: updates.status ?? project.status,
    codeVersion: (updates.codeVersion ?? project.codeVersion ?? 'v1.0').slice(0, 64),
    updatedAt: serverTimestamp(),
  };

  const nextHtml = updates.previewHtml !== undefined ? updates.previewHtml : project.previewHtml;
  if (typeof nextHtml === 'string' && nextHtml.length > 0) {
    updatePayload.previewHtml = nextHtml.slice(0, 250000);
  }

  try {
    await updateDoc(doc(db, 'projects', projectId), updatePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteProjectFromFirestore(
  rawProjectId: string,
  activeUserId: string = 'admin-it',
  activeUserEmail?: string | null,
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !isCloudIdentityVerifiedForAppUser(activeUserId, activeUserEmail)) return;

  const projectId = sanitizeFirestoreId(rawProjectId);
  const path = `projects/${projectId}`;
  try {
    await deleteDoc(doc(db, 'projects', projectId));
    // Also remove any associated activity_logs for this project owned by currentUser
    const logsQ = query(
      collection(db, 'activity_logs'),
      where('ownerUid', '==', currentUser.uid),
    );
    const snap = await getDocs(logsQ);
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      if (data.projectId === projectId) {
        await deleteDoc(doc(db, 'activity_logs', docSnap.id));
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncActivityLogToFirestore(
  entry: ActivityLogEntry,
  activeUserId: string,
  activeUserEmail?: string | null,
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !isCloudIdentityVerifiedForAppUser(activeUserId, activeUserEmail)) return;
  if ((entry.userId || 'admin-it') !== activeUserId) return;

  const logId = sanitizeFirestoreId(entry.id);
  const projectId = sanitizeFirestoreId(entry.projectId);
  const path = `activity_logs/${logId}`;

  const payload: Record<string, unknown> = {
    id: logId,
    ownerUid: currentUser.uid,
    projectId,
    projectName: (entry.projectName || 'Progetto').trim().slice(0, 60),
    userId: sanitizeFirestoreId(entry.userId || activeUserId),
    instructionText: (entry.instructionText || 'Istruzione').trim().slice(0, 1000),
    status: entry.status || 'recorded',
    type: entry.type || 'INSTRUCTION',
    activityType: entry.activityType || 'instruction',
    timestamp: (entry.timestamp || new Date().toISOString()).slice(0, 64),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (entry.codeVersion) {
    payload.codeVersion = entry.codeVersion.slice(0, 64);
  }

  try {
    await setDoc(doc(db, 'activity_logs', logId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchCloudProjectsAndLogs(
  expectedAppUserId: string,
  activeUserEmail?: string | null,
): Promise<{
  projects: Project[];
  logs: ActivityLogEntry[];
} | null> {
  const currentUser = auth.currentUser;
  if (!currentUser || !isCloudIdentityVerifiedForAppUser(expectedAppUserId, activeUserEmail)) {
    return null;
  }

  try {
    const projectsQ = query(collection(db, 'projects'), where('ownerUid', '==', currentUser.uid));
    const logsQ = query(collection(db, 'activity_logs'), where('ownerUid', '==', currentUser.uid));

    let projectsSnap;
    try {
      projectsSnap = await getDocs(projectsQ);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'projects');
    }

    let logsSnap;
    try {
      logsSnap = await getDocs(logsQ);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'activity_logs');
    }

    const sanitizedExpectedUserId = sanitizeFirestoreId(expectedAppUserId);

    const logs: ActivityLogEntry[] = logsSnap.docs
      .map((docSnap) => {
        const d = docSnap.data();
        const storedOwnerUid = String(d.ownerUid || '');
        const storedUserId = String(d.userId || '');
        // Never overwrite or import records belonging to another application user ID
        if (storedOwnerUid !== currentUser.uid || storedUserId !== sanitizedExpectedUserId) {
          return null;
        }
        return {
          id: String(d.id || docSnap.id),
          projectId: String(d.projectId || ''),
          projectName: String(d.projectName || 'Progetto'),
          userId: expectedAppUserId,
          instructionText: String(d.instructionText || ''),
          timestamp: String(d.timestamp || new Date().toISOString()),
          status: (d.status as ActivityLogEntry['status']) || 'recorded',
          type: (d.type as ActivityLogEntry['type']) || 'INSTRUCTION',
          activityType: (d.activityType as ActivityLogEntry['activityType']) || 'instruction',
          ...(d.codeVersion ? { codeVersion: String(d.codeVersion) } : {}),
        } as ActivityLogEntry;
      })
      .filter((item): item is ActivityLogEntry => item !== null);

    const projects: Project[] = projectsSnap.docs
      .map((docSnap) => {
        const d = docSnap.data();
        const storedOwnerUid = String(d.ownerUid || '');
        const storedUserId = String(d.userId || '');
        // Strictly verify both Firebase ownerUid AND application userId match
        if (storedOwnerUid !== currentUser.uid || storedUserId !== sanitizedExpectedUserId) {
          return null;
        }
        const projId = String(d.id || docSnap.id);
        const createdIso =
          d.createdAt instanceof Timestamp
            ? d.createdAt.toDate().toISOString()
            : new Date().toISOString();
        const updatedIso =
          d.updatedAt instanceof Timestamp ? d.updatedAt.toDate().toISOString() : createdIso;

        const projLogs = logs
          .filter((l) => l.projectId === projId && l.type !== 'EXPORT' && l.type !== 'EXPORT_PROJECT')
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        return {
          id: projId,
          userId: expectedAppUserId,
          name: String(d.name || 'Progetto'),
          description: String(d.description || ''),
          type: (d.type as Project['type']) || 'website',
          status: (d.status as Project['status']) || 'draft',
          instructions: projLogs.map((l) => ({
            id: l.id,
            text: l.instructionText,
            timestamp: l.timestamp,
            status: l.status,
            projectId: projId,
            projectName: String(d.name || 'Progetto'),
            userId: expectedAppUserId,
          })),
          previewHtml: typeof d.previewHtml === 'string' ? d.previewHtml : null,
          codeVersion: typeof d.codeVersion === 'string' ? d.codeVersion : 'v1.0',
          createdAt: createdIso,
          updatedAt: updatedIso,
        } as Project;
      })
      .filter((item): item is Project => item !== null);

    return { projects, logs };
  } catch (err) {
    console.warn('Firestore sync warning:', err);
    return null;
  }
}
