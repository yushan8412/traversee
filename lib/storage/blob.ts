import { BlobSASPermissions, BlobServiceClient, type ContainerClient } from '@azure/storage-blob'

/**
 * Unreviewed uploads. Private, so nothing a submitter sends has a reachable
 * public URL before somebody has looked at it. Approval copies to `public`.
 */
export const PENDING = 'pending'
export const PUBLIC = 'public'

let service: BlobServiceClient | null = null

function client(container: string): ContainerClient {
  if (!service) {
    const connection = process.env.STORAGE_CONNECTION_STRING
    if (!connection) {
      throw new Error('STORAGE_CONNECTION_STRING is not set; refusing to accept an upload.')
    }
    service = BlobServiceClient.fromConnectionString(connection)
  }
  return service.getContainerClient(container)
}

export async function uploadToPending(
  path: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  const blob = client(PENDING).getBlockBlobClient(path)
  await blob.upload(body, body.byteLength, { blobHTTPHeaders: { blobContentType: contentType } })
  return path
}

/**
 * Moves a file between the two containers.
 *
 * Server-side copy within the same account: immediate, and not billed as egress
 * the way a download-and-reupload would be. The source is deleted after the copy
 * so a file exists in exactly one container.
 */
async function move(from: string, to: string, path: string): Promise<void> {
  const source = client(from).getBlockBlobClient(path)
  const target = client(to).getBlockBlobClient(path)

  // Moving is idempotent, and a missing source means either the move already
  // happened or there was never a file at that path. Neither is a reason to
  // fail a review and leave a moderator unable to act on an entry because of a
  // storage inconsistency they cannot see or fix.
  if (!(await source.exists())) return

  // The private container's blobs answer 404 to unauthenticated readers, and
  // the destination is exactly that, so the copy needs a signed source URL.
  // Five minutes is far longer than a copy within one account takes.
  const signed = await source.generateSasUrl({
    permissions: BlobSASPermissions.parse('r'),
    expiresOn: new Date(Date.now() + 5 * 60_000),
  })

  const poller = await target.beginCopyFromURL(signed)
  await poller.pollUntilDone()
  await source.deleteIfExists()
}

/** Approval: the file becomes publicly readable. */
export const promoteToPublic = (path: string) => move(PENDING, PUBLIC, path)

/**
 * Taking something down. The file returns to the private container, because a
 * GPX that stays downloadable after its entry is unpublished makes unpublishing
 * mean nothing.
 */
export const demoteToPending = (path: string) => move(PUBLIC, PENDING, path)

/**
 * Removes a file for good, from whichever container currently holds it.
 *
 * A blob lives in exactly one of the two, and which one depends on the entry's
 * status at the moment of deletion — which is not worth reading first, because
 * deleting from the container that does not hold it is a no-op. Trying both is
 * cheaper and cannot get the answer wrong.
 */
export async function removeEverywhere(path: string): Promise<void> {
  await Promise.all([
    client(PENDING).getBlockBlobClient(path).deleteIfExists(),
    client(PUBLIC).getBlockBlobClient(path).deleteIfExists(),
  ])
}
