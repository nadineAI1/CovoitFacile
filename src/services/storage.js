
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const storage = getStorage();


export async function uploadImageAsync(localUri, path) {
  if (!localUri) throw new Error('localUri required');
  if (!path) throw new Error('storage path required');

  // Fetch the file at localUri to a blob
  const response = await fetch(localUri);
  const blob = await response.blob();

  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  const url = await getDownloadURL(storageRef);
  return url;
}