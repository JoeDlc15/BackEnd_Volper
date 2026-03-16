const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    try {
        console.log("--- DEBUG START ---");
        
        // Let's find quote #15 (from screenshot)
        const quote = await prisma.quoteRequest.findUnique({
            where: { id: 15 },
            include: { items: true }
        });

        if (!quote) {
            console.log("Quote #15 not found. Let's list some quotes:");
            const quotes = await prisma.quoteRequest.findMany({ take: 5, include: { items: true } });
            console.log(JSON.stringify(quotes, null, 2));
            return;
        }

        console.log("Quote #15 items:");
        for (const item of quote.items) {
            console.log(`- Item: "${item.productName}" | SKU: "${item.sku}" (Length: ${item.sku.length})`);
            
            // Try to find variant exactly
            const variantExact = await prisma.productVariant.findUnique({
                where: { sku: item.sku }
            });
            console.log(`  > Exact Match: ${variantExact ? 'FOUND (Stock: ' + variantExact.stock + ')' : 'NOT FOUND'}`);

            // Try to find variant case-insensitive and trimmed
            const allVariants = await prisma.productVariant.findMany({
                where: {
                    sku: {
                        contains: item.sku.trim(),
                        mode: 'insensitive'
                    }
                }
            });
            console.log(`  > Potential Matches (Trimmed/Insensitive): ${allVariants.length}`);
            allVariants.forEach(v => {
                console.log(`    * Found SKU: "${v.sku}" (Length: ${v.sku.length}) | Stock: ${v.stock}`);
            });
        }

        console.log("--- DEBUG END ---");
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

debug();
