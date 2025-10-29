// scripts/migrateToSupabase.ts
// Run this script once to migrate your localStorage data to Supabase
// Usage: tsx scripts/migrateToSupabase.ts

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// You'll need to set these from your Supabase project
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Error: Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper to convert camelCase to snake_case
const toSnakeCase = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (typeof obj !== 'object') return obj;

  const snakeCaseObj: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    snakeCaseObj[snakeKey] = toSnakeCase(obj[key]);
  }
  return snakeCaseObj;
};

async function migrateData() {
  console.log('🚀 Starting migration to Supabase...\n');

  // Read the exported JSON file
  const dataPath = process.argv[2] || './backup.json';
  
  if (!fs.existsSync(dataPath)) {
    console.error(`Error: Data file not found at ${dataPath}`);
    console.log('\nTo migrate your data:');
    console.log('1. Open your app in the browser');
    console.log('2. Go to Settings tab');
    console.log('3. Click "Export Data" to download backup.json');
    console.log('4. Run: tsx scripts/migrateToSupabase.ts ./backup.json');
    process.exit(1);
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(rawData);

  console.log('📦 Data loaded from:', dataPath);

  // Tables to migrate in order (respecting foreign key constraints)
  const migrationOrder = [
    'skills',
    'members',
    'member_skills',
    'member_aliases',
    'areas',
    'tasks',
    'explicit_rules',
    'weekly_schedule',
    'assignments',
    'templates',
    'manager_settings',
    'order_sets',
    'order_set_items',
    'staffing_targets',
    'availability',
    'shift_templates',
    'planned_shifts',
    'shift_patterns',
  ];

  let totalRecords = 0;
  let errors = 0;

  for (const tableName of migrationOrder) {
    const tableData = data[tableName];
    
    if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
      console.log(`⏭️  Skipping ${tableName} (no data)`);
      continue;
    }

    console.log(`\n📝 Migrating ${tableName}...`);
    console.log(`   Records to migrate: ${tableData.length}`);

    // Convert camelCase to snake_case for Supabase
    const snakeData = tableData.map(toSnakeCase);

    // Insert in batches of 100 to avoid timeouts
    const batchSize = 100;
    for (let i = 0; i < snakeData.length; i += batchSize) {
      const batch = snakeData.slice(i, i + batchSize);
      
      const { data: insertedData, error } = await supabase
        .from(tableName)
        .upsert(batch, { onConflict: 'id' });

      if (error) {
        console.error(`   ❌ Error inserting batch ${i / batchSize + 1}:`, error.message);
        errors++;
      } else {
        totalRecords += batch.length;
        process.stdout.write(`   ✅ Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(snakeData.length / batchSize)} done\r`);
      }
    }
    console.log(`\n   ✨ Completed ${tableName}`);
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Migration complete!`);
  console.log(`   Total records migrated: ${totalRecords}`);
  console.log(`   Errors: ${errors}`);
  console.log('='.repeat(50));
  
  if (errors > 0) {
    console.log('\n⚠️  Some errors occurred. Please check the logs above.');
  } else {
    console.log('\n🎉 All data successfully migrated to Supabase!');
    console.log('\nNext steps:');
    console.log('1. Verify your data in Supabase dashboard');
    console.log('2. Update App.tsx to import supabaseClient instead of supabaseMock');
    console.log('3. Test your app with the real backend');
  }
}

migrateData().catch(console.error);
