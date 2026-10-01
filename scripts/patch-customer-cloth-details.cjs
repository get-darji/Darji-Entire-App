const fs = require('fs');
const path = require('path');

const appTsxPath = path.resolve(__dirname, '../apps/customer-app/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// 1. Add import if not present
if (!content.includes('ClothDetailsSelectionView')) {
  const importTarget = `from "./src/config/clothDetails";`;
  const replacement = `from "./src/config/clothDetails";\nimport { ClothDetailsSelectionView } from "./src/features/cloth-details/ClothDetailsSelectionView";`;
  content = content.replace(importTarget, replacement);
}

// 2. Replace stage === "work" block
const oldWorkBlockRegex = /\{stage === "work" \? \([\s\S]*?disabled=\{!canContinueToMeasurements\}\s*\/>\s*<\/>\s*\) : null\}/;

const newWorkBlock = `{stage === "work" ? (
          <>
            <ClothDetailsSelectionView
              gender={draft.gender}
              clothType={draft.clothType}
              otherClothType={draft.otherClothType}
              serviceCategory={draft.serviceCategory}
              selectedWorkItems={selectedWorkItems}
              otherWorkDescription={draft.otherWorkDescription}
              garmentSearch={garmentSearch}
              filteredGarments={filteredGarments}
              selectedService={selectedService}
              onSelectGender={selectGender}
              onSelectClothType={selectClothType}
              onChangeOtherClothType={(otherClothType) => setDraft({ ...draft, otherClothType })}
              onSelectServiceCategory={selectServiceCategory}
              onToggleWorkItem={toggleWorkItem}
              onChangeOtherWorkDescription={(otherWorkDescription) => setDraft({ ...draft, otherWorkDescription })}
              onGarmentSearchChange={setGarmentSearch}
            />

            <RequestFlowCta
              label="Continue to Measurements"
              onPress={() => setScreen("measurements")}
              disabled={!canContinueToMeasurements}
            />
          </>
        ) : null}`;

if (oldWorkBlockRegex.test(content)) {
  content = content.replace(oldWorkBlockRegex, newWorkBlock);
  fs.writeFileSync(appTsxPath, content, 'utf8');
  console.log('Successfully patched App.tsx with redesigned ClothDetailsSelectionView!');
} else {
  console.error('Could not find work block in App.tsx');
}
