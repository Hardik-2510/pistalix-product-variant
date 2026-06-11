import { useState, useCallback } from "react";
import { useNavigate, useLoaderData, useFetcher } from "react-router";
import {
  Page,
  Card,
  EmptyState,
  AppProvider,
  Popover,
  ActionList,
  Button,
  InlineStack,
  Text,
  Box,
  Modal,
  BlockStack,
  IndexTable,
  useIndexResourceState,
  Badge
} from "@shopify/polaris";
import english from "@shopify/polaris/locales/en.json";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const optionSets = await prisma.optionSet.findMany({
    where: { shopId: session.shop, status: { not: "TEMPLATE" } },
    orderBy: { updatedAt: "desc" }
  });
  return { optionSets };
};

export const action = async ({ request }) => {
  await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  
  if (intent === "delete") {
    const ids = JSON.parse(formData.get("ids") || "[]");
    if (ids.length > 0) {
      await prisma.optionSet.deleteMany({ where: { id: { in: ids } } });
      return { success: true };
    }
  }
  return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
};

export default function Index() {
  const { optionSets } = useLoaderData();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const [popoverActive, setPopoverActive] = useState(false);
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
    clearSelection,
  } = useIndexResourceState(optionSets);
  
  const togglePopoverActive = useCallback(
    () => setPopoverActive((active) => !active),
    []
  );

  const dropdownActivator = (
    <Button onClick={togglePopoverActive} variant="primary" disclosure>
      Create option set
    </Button>
  );

  const rowMarkup = optionSets.map(
    ({ id, name, status, updatedAt }, index) => (
      <IndexTable.Row
        id={id}
        key={id}
        position={index}
        selected={selectedResources.includes(id)}
        onClick={() => navigate(`/app/option-sets/${id}`)}
      >
        <IndexTable.Cell>
          <Text variant="bodyMd" fontWeight="bold" as="span">
            {name}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Badge tone={status === "active" ? "success" : "attention"}>
            {status === "active" ? "Active" : "Draft"}
          </Badge>
        </IndexTable.Cell>
        <IndexTable.Cell>{new Date(updatedAt).toLocaleDateString()}</IndexTable.Cell>
      </IndexTable.Row>
    )
  );

  return (
    <AppProvider i18n={english}>
      <Page>
        <Box paddingBlockEnd="400">
          <InlineStack align="space-between" blockAlign="center">
            <Text variant="headingLg" as="h1">
              Option Sets
            </Text>
            
            <InlineStack gap="300">
              <Button disabled>Import option sets ⭐</Button>
              <Popover
                active={popoverActive}
                activator={dropdownActivator}
                autofocusTarget="first-node"
                onClose={togglePopoverActive}
              >
                <ActionList
                  actionRole="menuitem"
                  items={[
                    { 
                      content: "Create from scratch",
                      onAction: () => navigate("/app/option-sets/new")
                    },
                    { 
                      content: "Use a template",
                      onAction: () => navigate("/app/templates")
                    },
                  ]}
                />
              </Popover>
            </InlineStack>
          </InlineStack>
        </Box>

        <Card padding="0">
          {optionSets.length === 0 ? (
            <EmptyState
              heading="No option sets found"
              action={{
                content: "Create from scratch",
                variant: "primary",
                onAction: () => navigate("/app/option-sets/new")
              }}
              secondaryAction={{
                content: "Learn more",
                onAction: () => setLearnMoreOpen(true)
              }}
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>Try changing the filters or search term</p>
            </EmptyState>
          ) : (
            <IndexTable
              resourceName={{ singular: 'option set', plural: 'option sets' }}
              itemCount={optionSets.length}
              headings={[
                { title: 'Name' },
                { title: 'Status' },
                { title: 'Last Updated' },
              ]}
              selectedItemsCount={
                allResourcesSelected ? 'All' : selectedResources.length
              }
              onSelectionChange={handleSelectionChange}
              promotedBulkActions={[
                {
                  content: 'Delete',
                  onAction: () => setDeleteModalOpen(true),
                },
              ]}
            >
              {rowMarkup}
            </IndexTable>
          )}
        </Card>

        <Modal
          open={learnMoreOpen}
          onClose={() => setLearnMoreOpen(false)}
          title="About Option Sets"
          primaryAction={{
            content: 'Got it',
            onAction: () => setLearnMoreOpen(false),
          }}
        >
          <Modal.Section>
            <BlockStack gap="300">
              <Text as="p">
                Option Sets allow you to create reusable groups of custom product options (like text fields, file uploads, swatches, and more).
              </Text>
              <Text as="p">
                Instead of adding the same options to each product individually, you can build an Option Set once and assign it to multiple products or collections simultaneously. When you update the Option Set, all assigned products are updated automatically.
              </Text>
            </BlockStack>
          </Modal.Section>
        </Modal>

        <Modal
          open={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title={`Remove ${selectedResources.length} option set${selectedResources.length > 1 ? 's' : ''}?`}
          primaryAction={{
            content: 'Delete',
            destructive: true,
            onAction: () => {
              fetcher.submit(
                { intent: "delete", ids: JSON.stringify(selectedResources) },
                { method: "POST" }
              );
              setDeleteModalOpen(false);
              clearSelection();
              if (typeof shopify !== 'undefined' && shopify.toast) {
                shopify.toast.show("Option sets deleted");
              }
            },
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: () => setDeleteModalOpen(false),
            },
          ]}
        >
          <Modal.Section>
            <Text as="p">This can&apos;t be undone.</Text>
          </Modal.Section>
        </Modal>
      </Page>
    </AppProvider>
  );
}