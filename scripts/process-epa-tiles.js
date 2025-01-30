import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const execAsync = promisify(exec)

const BUCKET = 'cec-geo-data'
const EPA_PREFIX = 'epa-ira-disadvantaged-communities'
const TEMP_DIR = path.join(process.cwd(), 'temp_processing')

const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY
  }
})

async function processChunk(chunkNumber) {
  console.log(`Processing chunk ${chunkNumber}...`)
  
  const key = `${EPA_PREFIX}/chunk${chunkNumber}.geojson`
  const response = await s3Client.send(new GetObjectCommand({
    Bucket: BUCKET,
    Key: key
  }))

  const chunkPath = path.join(TEMP_DIR, `chunk${chunkNumber}.geojson`)
  await fs.writeFile(chunkPath, await response.Body.transformToString())

  const mbtilePath = path.join(TEMP_DIR, `chunk${chunkNumber}.mbtiles`)
  
  try {
    console.log(`Generating tiles for chunk ${chunkNumber}...`)
    await execAsync(`tippecanoe -o ${mbtilePath} \
      --maximum-zoom=10 \
      --minimum-zoom=2 \
      --simplification=10 \
      --force \
      --name="EPA Disadvantaged Communities ${chunkNumber}" \
      --layer="epa-disadvantaged-${chunkNumber}" \
      --buffer=32 \
      --base-zoom=8 \
      --hilbert \
      --drop-densest-as-needed \
      --extend-zooms-if-still-dropping \
      ${chunkPath}`,
      {
        maxBuffer: 1024 * 1024 * 500
      }
    )
    console.log(`Successfully generated tiles for chunk ${chunkNumber}`)
  } catch (error) {
    console.error(`Warning: Initial tiling failed for chunk ${chunkNumber}:`, error.message)
    console.log(`Retrying chunk ${chunkNumber} with more aggressive simplification...`)
    
    await execAsync(`tippecanoe -o ${mbtilePath} \
      --maximum-zoom=8 \
      --minimum-zoom=2 \
      --simplification=20 \
      --force \
      --name="EPA Disadvantaged Communities ${chunkNumber}" \
      --layer="epa-disadvantaged-${chunkNumber}" \
      --buffer=16 \
      --base-zoom=6 \
      --hilbert \
      --drop-densest-as-needed \
      --drop-fraction-as-needed \
      ${chunkPath}`,
      {
        maxBuffer: 1024 * 1024 * 500
      }
    )
    console.log(`Successfully generated tiles for chunk ${chunkNumber} with fallback settings`)
  }

  console.log(`Uploading chunk ${chunkNumber}...`)
  const fileContent = await fs.readFile(mbtilePath)
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: `${EPA_PREFIX}/vector-tiles/chunk${chunkNumber}.mbtiles`,
    Body: fileContent,
    ContentType: 'application/x-mbtiles'
  }))

  console.log(`Completed chunk ${chunkNumber}`)
}

async function cleanup() {
  console.log('Cleaning up...')
  await fs.rm(TEMP_DIR, { recursive: true, force: true })
}

async function main() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true })
    
    // Process chunks sequentially
    for (let i = 1; i <= 7; i++) {
      await processChunk(i)
    }
    
    await cleanup()
    console.log('All chunks processed successfully!')
  } catch (error) {
    console.error('Error:', error)
    await cleanup()
    process.exit(1)
  }
}

main() 