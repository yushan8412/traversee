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
 * Moves an approved file into the public container.
 *
 * Server-side copy within the same account: immediate, and not billed as
 * egress, which a download-and-reupload would be. The source is deleted
 * afterwards so an approved file does not remain readable from the private
 * container's path as well.
 */
export async function promoteToPublic(path: string): Promise<void> {
  const source = client(PENDING).getBlockBlobClient(path)
  const target = client(PUBLIC).getBlockBlobClient(path)

  // The source container is private, so the copy needs a signed URL — the
  // destination cannot read an unauthenticated blob URL that answers 404 to
  // everyone. Five minutes is far longer than a copy within one account takes.
  const signed = await source.generateSasUrl({
    permissions: BlobSASPermissions.parse('r'),
    expiresOn: new Date(Date.now() + 5 * 60_000),
  })

  const poller = await target.beginCopyFromURL(signed)
  await poller.pollUntilDone()
  // Deleted so an approved file is not still readable from the private path.
  await source.deleteIfExists()
}
