import { IndexTable, useIndexResourceState, Button, Popover, ActionList } from "@shopify/polaris";
import { useState, useCallback } from "react";
import StatusBadge from "./StatusBadge";
import { useNavigate } from "react-router";

export default function OptionSetTable({ optionSets }) {
  const navigate = useNavigate();
  const [popoverId, setPopoverId] = useState(null);
  const togglePopover = useCallback((id) => setPopoverId(popoverId === id ? null : id), [popoverId]);

  const { selectedResources, allResourcesSelected, handleSelectionChange } = useIndexResourceState(optionSets, {
    resourceIdResolver: (optionSet) => optionSet.id,
  });

  const rowMarkup = optionSets.map(
    ({ id, name, status, updatedAt }, index) => (
      <IndexTable.Row
        id={id}
        key={id}
        selected={selectedResources.includes(id)}
        position={index}
      >
        <IndexTable.Cell>
          <Button variant="plain" onClick={() => navigate(`/app/option-sets/${id}`)}>
            {name}
          </Button>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <StatusBadge status={status} />
        </IndexTable.Cell>
        <IndexTable.Cell>—</IndexTable.Cell>
        <IndexTable.Cell>{new Date(updatedAt).toLocaleDateString()}</IndexTable.Cell>
        <IndexTable.Cell>
          <Popover
            active={popoverId === id}
            activator={
              <Button variant="tertiary" onClick={() => togglePopover(id)} disclosure>
                Actions
              </Button>
            }
            onClose={() => setPopoverId(null)}
          >
            <ActionList
              items={[
                { content: "Edit", onAction: () => navigate(`/app/option-sets/${id}`) },
                { content: "Duplicate" },
                { content: "Delete", tone: "critical" },
              ]}
            />
          </Popover>
        </IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

  return (
    <IndexTable
      resourceName={{ singular: "option set", plural: "option sets" }}
      itemCount={optionSets.length}
      selectedItemsCount={allResourcesSelected ? "All" : selectedResources.length}
      onSelectionChange={handleSelectionChange}
      headings={[
        { title: "Name" },
        { title: "Status" },
        { title: "Products" },
        { title: "Last updated" },
        { title: "Actions" },
      ]}
    >
      {rowMarkup}
    </IndexTable>
  );
}
