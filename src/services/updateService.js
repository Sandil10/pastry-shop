import { doc, getDoc, setDoc } from "firebase/firestore";
import { db as firestore, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db as localDb } from "../db";

/**
 * Update Manager Service (Firebase Hosting & Firestore Lite)
 * Optimized version: No Storage dependency, using Hosting for installer downloads.
 */

export const CURRENT_VERSION = "1.0.2";
export const CURRENT_BUILD = 2;

/**
 * Check for updates using a one-time fetch via Firestore Lite
 */
export const checkAppUpdate = async () => {
    try {
        if (!navigator.onLine) return null; 

        // Document location in Firestore
        const docRef = doc(firestore, "app_meta", "pastry_pos_update");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const remoteData = docSnap.data();
            
            // Version comparison - Safety check to prevent split() error
            const needsUpdate = (remoteData.version && CURRENT_VERSION) 
               ? compareVersions(remoteData.version, CURRENT_VERSION) 
               : false;
            
            if (needsUpdate && remoteData.published) {
                return {
                    version: remoteData.version,
                    notes: remoteData.notes,
                    url: remoteData.downloadUrl,
                    mandatory: remoteData.mandatory,
                    branding: remoteData.branding || null,
                    productsUrl: remoteData.productsUrl || null
                };
            }
            if (remoteData.branding || remoteData.productsUrl) {
              return { 
                branding: remoteData.branding, 
                productsUrl: remoteData.productsUrl 
              };
            }
        }
        return null;
    } catch (error) {
        console.warn("Update check failed (Firestore Lite):", error.message);
        return null;
    }
}

/**
 * PUSH NEW UPDATE (MASTER ADMIN ONLY)
 * Sets the document in Firestore to trigger updates for all clients.
 */
export const pushAppUpdate = async (notes, url, mandatory = false, branding = null, productsUrl = null) => {
    try {
        const docRef = doc(firestore, "app_meta", "pastry_pos_update");
        await setDoc(docRef, {
            version: CURRENT_VERSION,
            notes: notes,
            downloadUrl: url,
            published: true,
            mandatory: mandatory,
            branding: branding,
            productsUrl: productsUrl, // Link to global product blob
            updatedAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error("Failed to push update to Firestore:", error);
        throw error;
    }
}

/**
 * Helper to compare semantic versions
 */
export const compareVersions = (remote, local) => {
    if (!remote || !local) return false;
    const r = String(remote).split('.').map(Number);
    const l = String(local).split('.').map(Number);
    
    for (let i = 0; i < Math.max(r.length, l.length); i++) {
        const rv = r[i] || 0;
        const lv = l[i] || 0;
        if (rv > lv) return true;
        if (rv < lv) return false;
    }
    return false;
}

/**
 * Trigger download from Firebase Hosting
 */
export const triggerUpdateDownload = (url) => {
    if (window.ipcRenderer) {
        // Direct browser-like download
        window.open(url, '_blank');
    } else {
        // Fallback for web view
        window.open(url, '_blank');
    }
}

/**
 * SYNC PRODUCTS TO CLOUD (MASTER ADMIN ONLY)
 * Switched to Firestore synchronization to avoid Storage CORS issues.
 */
export const syncProductsToCloud = async () => {
    if (!navigator.onLine) throw new Error("Internet required for sync.");
    try {
        const all = await localDb.pos_products.toArray();
        const docRef = doc(firestore, "app_meta", "master_products_sync");
        
        // Save entire inventory as a nested array in one document
        await setDoc(docRef, { 
            products: all,
            updatedAt: new Date().toISOString()
        });
        
        return "FIRESTORE_SYNC"; // Indicating we're using Firestore
    } catch (err) {
        console.error("Master Product Sync Error:", err);
        throw err;
    }
}

/**
 * APPLY PRODUCTS SYNC (CLIENT ONLY)
 * Fetches the master product inventory from Firestore.
 */
export const downloadAndSyncProducts = async (isManual = false) => {
    try {
        const docRef = doc(firestore, "app_meta", "master_products_sync");
        const snapshot = await getDoc(docRef);
        
        if (snapshot.exists()) {
            const data = snapshot.data();
            if (data && Array.isArray(data.products)) {
                await localDb.pos_products.clear();
                await localDb.pos_products.bulkAdd(data.products);
                return true;
            }
        }
    } catch (e) { 
        console.error("Client Sync Apply Error:", e); 
    }
    return false;
}
