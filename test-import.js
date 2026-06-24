import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  try {
    const session = { shop: 'varify-pov.myshopify.com' };
    const tpl = {
      name: "Mock Template",
      sections: [
        { id: "sec1", title: "Section 1", order: 0, visible: true, styles: { color: "red" } }
      ],
      elements: [
        { id: "el1", sectionId: "sec1", type: "text", label: "Label", subtext: "", required: false, order: 0, config: { color: "blue" } }
      ]
    };

    const createdOptionSet = await prisma.optionSet.create({
      data: {
        shopId: session.shop,
        name: tpl.name + (tpl.name && tpl.name.includes("(Imported)") ? "" : " (Imported)"),
        status: "TEMPLATE",
        sections: {
          create: tpl.sections?.map(sec => ({
            title: sec.title,
            order: sec.order,
            visible: sec.visible,
            styles: typeof sec.styles === 'object' ? JSON.stringify(sec.styles) : sec.styles,
          })) || []
        },
        productRules: tpl.productRules && tpl.productRules.length > 0 ? {
          create: tpl.productRules.map(pr => ({
            targetType: pr.targetType,
            targetValues: typeof pr.targetValues === 'object' ? JSON.stringify(pr.targetValues) : pr.targetValues
          }))
        } : undefined
      },
      include: { sections: true }
    });

    if (tpl.elements && tpl.elements.length > 0 && tpl.sections) {
      const elementsToCreate = tpl.elements.map(e => {
        const originalSectionIndex = tpl.sections.findIndex(s => s.id === e.sectionId);
        const newSectionId = createdOptionSet.sections[originalSectionIndex]?.id;
        return {
          optionSetId: createdOptionSet.id,
          sectionId: newSectionId,
          type: e.type,
          label: e.label,
          subtext: e.subtext,
          required: e.required,
          order: e.order,
          config: typeof e.config === 'object' ? JSON.stringify(e.config) : e.config
        };
      }).filter(e => e.sectionId);

      if (elementsToCreate.length > 0) {
        await prisma.element.createMany({ data: elementsToCreate });
      }
    }
    console.log("Success:", createdOptionSet.id);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
