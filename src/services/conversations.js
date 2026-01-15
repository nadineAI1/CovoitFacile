import { collection, getDocs, doc, deleteDoc, writeBatch, query, limit } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Supprime une conversation et sa sous-collection messages en lots.
 * Retourne true si ok, lève l'erreur sinon.
 */
export async function deleteConversation(conversationId) {
  if (!conversationId) throw new Error('conversationId required');

  const convId = String(conversationId);
  const convRef = doc(db, 'conversations', convId);

  try {
    // Supprimer les messages par batch (500 max par batch)
    while (true) {
      const messagesCol = collection(db, 'conversations', convId, 'messages');
      const q = query(messagesCol, limit(500));
      const snap = await getDocs(q);
      if (snap.empty) break;
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }

    // Supprimer le doc conversation
    await deleteDoc(convRef);
    return true;
  } catch (e) {
    throw e;
  }
}

export default { deleteConversation };