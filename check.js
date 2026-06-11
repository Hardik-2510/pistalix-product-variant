import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const optionSetId = 'cmq95ozyl000uvh6wv75zkshk';
  const tpl = await prisma.optionSet.findUnique({
    where: { id: optionSetId },
    include: { sections: true, elements: true, productRules: true }
  });

  if (!tpl) { console.log('not found'); return; }

  const parsedSections = tpl.sections;
  const parsedElements = tpl.elements.map(e => ({...e, config: JSON.parse(e.config)}));
  
  await prisma.section.deleteMany({ where: { optionSetId: optionSetId } });
  await prisma.element.deleteMany({ where: { optionSetId: optionSetId } });
  
  // Simulate action
  const secIdMap = {};
  for (const sec of parsedSections) {
    if (sec.id && sec.id.startsWith("sec_")) {
      secIdMap[sec.id] = sec.id;
    } else {
      secIdMap[sec.id] = `sec_${crypto.randomUUID().replace(/-/g, "")}`;
    }
  }

  const elIdMap = {};
  for (const el of parsedElements) {
    if (el.id && el.id.startsWith("el_")) {
      elIdMap[el.id] = el.id;
    } else {
      elIdMap[el.id] = `el_${crypto.randomUUID().replace(/-/g, "")}`;
    }
  }

  for (const el of parsedElements) {
    el.newId = elIdMap[el.id];
  }

  try {
    for (let idx = 0; idx < parsedSections.length; idx++) {
      const sec = parsedSections[idx];
      const newSecId = secIdMap[sec.id];
      console.log('creating section', newSecId);
      await prisma.section.create({
        data: {
          id: newSecId,
          optionSetId: optionSetId,
          title: sec.title || `Section ${idx + 1}`,
          order: idx,
          visible: sec.visible !== false,
          styles: JSON.stringify(sec.styles || {})
        }
      });

      const sectionElements = parsedElements.filter(el => el.sectionId === sec.id);
      if (sectionElements.length > 0) {
        await prisma.element.createMany({
          data: sectionElements.map((el, elIdx) => {
            const updatedConfig = { ...(el.config || {}), sectionId: newSecId };
            return {
              id: el.newId,
              optionSetId: optionSetId,
              sectionId: newSecId,
              type: el.type || "Text",
              label: el.label || "Option",
              subtext: el.placeholder || el.config?.subtext || null,
              required: el.required || false,
              order: elIdx,
              config: JSON.stringify(updatedConfig),
            };
          }),
        });
      }
    }
    console.log('Success!');
  } catch (e) {
    console.log('Error:', e);
  }
}
main().finally(() => prisma.$disconnect());
