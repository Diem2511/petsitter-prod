import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 ========== DEBUG DATABASE CRÍTICO ==========');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.log('❌ DATABASE_URL: NO CONFIGURADO');
} else {
  console.log('✅ DATABASE_URL: CONFIGURADO');
  
  // Mostrar URL segura (sin password)
  const safeUrl = databaseUrl.replace(/:[^:@]+@/, ':****@');
  console.log('🔗 URL (segura):', safeUrl);
  
  // Verificar si contiene la IPv6 problemática
  if (databaseUrl.includes('2600:1f1e:75b:4b14:ca7c:d081:db20:6e1')) {
    console.error('🚨🚨🚨 ERROR CRÍTICO DETECTADO 🚨🚨🚨');
    console.error('   DATABASE_URL contiene la IPv6 incorrecta!');
    console.error('   Esto está causando el error ENETUNREACH');
    console.error('\n💡 SOLUCIÓN INMEDIATA:');
    console.error('   1. Ve a Render Dashboard → Environment');
    console.error('   2. ELIMINA DATABASE_URL actual');
    console.error('   3. CREA NUEVA con este valor EXACTO:');
    console.error('      postgresql://postgres:[PASSWORD]@db.qzgdviycwxzmvwtazkis.supabase.co:5432/postgres?sslmode=require');
  }
  
  // Verificar si contiene el hostname correcto
  if (databaseUrl.includes('db.qzgdviycwxzmvwtazkis.supabase.co')) {
    console.log('✅ Hostname correcto detectado en DATABASE_URL');
  } else {
    console.warn('⚠️ Hostname NO es el correcto de Supabase');
  }
}

console.log('===========================================\n');