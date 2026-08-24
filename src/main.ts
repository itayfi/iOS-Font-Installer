import './styles.css';
import { buildProfile, downloadProfile, identifierForFamily, randomIdentifier } from './profile';
import { downloadVariant, filterFamilies, loadCatalog, previewStylesheetUrl } from './google-fonts';
import { readLocalFonts } from './local-fonts';
import type { FontAsset, GoogleFontCatalog, GoogleFontFamily } from './types';

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id}`);
  return element as T;
};

const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('.source-tab'));
const googlePanel = byId<HTMLDivElement>('google-panel');
const uploadPanel = byId<HTMLDivElement>('upload-panel');
const searchInput = byId<HTMLInputElement>('font-search');
const categorySelect = byId<HTMLSelectElement>('category-filter');
const results = byId<HTMLDivElement>('font-results');
const catalogStatus = byId<HTMLParagraphElement>('catalog-status');
const familySelection = byId<HTMLDivElement>('family-selection');
const fileInput = byId<HTMLInputElement>('file-upload');
const fileName = byId<HTMLParagraphElement>('file-name');
const form = byId<HTMLFormElement>('config-form');
const displayName = byId<HTMLInputElement>('payloadDisplayName');
const description = byId<HTMLInputElement>('payloadDescription');
const identifier = byId<HTMLInputElement>('payloadIdentifier');
const prepareButton = byId<HTMLButtonElement>('prepare-button');
const downloadButton = byId<HTMLButtonElement>('download-button');
const actionStatus = byId<HTMLDivElement>('action-status');

let source: 'google' | 'upload' = 'google';
let catalog: GoogleFontCatalog | null = null;
let selectedFamily: GoogleFontFamily | null = null;
let preparedProfile: string | null = null;
let previewStylesheet: HTMLLinkElement | null = null;

function setStatus(message: string, error = false): void {
  actionStatus.textContent = message;
  actionStatus.classList.toggle('error', error);
}

function invalidateProfile(): void {
  preparedProfile = null;
  downloadButton.hidden = true;
  prepareButton.hidden = false;
}

function selectSource(nextSource: 'google' | 'upload'): void {
  source = nextSource;
  tabs.forEach((tab) => {
    const active = tab.dataset.source === nextSource;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  googlePanel.hidden = nextSource !== 'google';
  uploadPanel.hidden = nextSource !== 'upload';
  invalidateProfile();
  setStatus('');
}

function categoryLabel(category: string): string {
  return category.toLowerCase().replace('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
}

function renderResults(): void {
  if (!catalog) return;
  const matches = filterFamilies(catalog.families, searchInput.value, categorySelect.value);
  const visible = matches.slice(0, 60);
  catalogStatus.textContent = `${matches.length.toLocaleString()} static font families`;
  const cards: HTMLElement[] = visible.map((family) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'font-card';
    button.innerHTML = `<span><strong></strong><small></small></span><span aria-hidden="true">›</span>`;
    const strong = button.querySelector('strong');
    const small = button.querySelector('small');
    if (strong) strong.textContent = family.family;
    if (small) small.textContent = `${categoryLabel(family.category)} · ${family.variants.length} style${family.variants.length === 1 ? '' : 's'}`;
    button.addEventListener('click', () => selectFamily(family));
    return button;
  });

  if (matches.length > visible.length) {
    const message = document.createElement('p');
    message.className = 'font-results-message';
    message.textContent = `Showing the ${visible.length} most popular matches. Search to find a specific family.`;
    cards.push(message);
  }

  results.replaceChildren(...cards);
}

function selectFamily(family: GoogleFontFamily): void {
  selectedFamily = family;
  invalidateProfile();
  displayName.value = family.family;
  description.value = `${family.family} from Google Fonts`;
  identifier.value = identifierForFamily(family.family);
  familySelection.hidden = false;
  familySelection.replaceChildren();

  previewStylesheet?.remove();
  previewStylesheet = document.createElement('link');
  previewStylesheet.rel = 'stylesheet';
  previewStylesheet.href = previewStylesheetUrl(family);
  document.head.append(previewStylesheet);

  const heading = document.createElement('div');
  heading.className = 'selection-title';
  const title = document.createElement('h3');
  title.textContent = family.family;
  const selectAll = document.createElement('button');
  selectAll.type = 'button';
  selectAll.className = 'link-button';
  selectAll.textContent = 'Select all styles';
  heading.append(title, selectAll);

  const options = document.createElement('div');
  options.className = 'style-options';
  family.variants.forEach((variant) => {
    const label = document.createElement('label');
    label.className = 'style-option';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = variant.url;
    checkbox.checked = variant.weight === 400 && variant.style === 'normal';
    checkbox.addEventListener('change', invalidateProfile);
    const variantName = document.createElement('span');
    variantName.className = 'variant-name';
    variantName.textContent = variant.label;
    variantName.style.fontFamily = `"${family.family}", Montserrat, sans-serif`;
    variantName.style.fontStyle = variant.style;
    variantName.style.fontWeight = String(variant.weight);
    label.append(checkbox, variantName);
    options.append(label);
  });
  selectAll.addEventListener('click', () => {
    options.querySelectorAll<HTMLInputElement>('input').forEach((checkbox) => { checkbox.checked = true; });
    invalidateProfile();
  });
  familySelection.append(heading, options);
  familySelection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function selectedAssets(): Promise<FontAsset[]> {
  if (source === 'upload') {
    if (!fileInput.files?.length) throw new Error('Select at least one static font file.');
    setStatus('Checking local font files…');
    return readLocalFonts(fileInput.files);
  }
  if (!selectedFamily) throw new Error('Choose a Google Fonts family.');
  const checked = Array.from(familySelection.querySelectorAll<HTMLInputElement>('input:checked'));
  if (checked.length === 0) throw new Error('Select at least one static style.');
  if (checked.length > 20) throw new Error('Select no more than 20 styles at once to avoid exhausting mobile memory.');
  const variants = checked.map((checkbox) => selectedFamily?.variants.find((variant) => variant.url === checkbox.value)).filter((variant) => variant !== undefined);
  const assets: FontAsset[] = [];
  for (const [index, variant] of variants.entries()) {
    setStatus(`Downloading ${variant.label} (${index + 1} of ${variants.length})…`);
    assets.push(await downloadVariant(selectedFamily, variant));
  }
  return assets;
}

tabs.forEach((tab) => tab.addEventListener('click', () => selectSource(tab.dataset.source === 'upload' ? 'upload' : 'google')));
searchInput.addEventListener('input', renderResults);
categorySelect.addEventListener('change', renderResults);
fileInput.addEventListener('change', () => {
  const count = fileInput.files?.length ?? 0;
  fileName.textContent = count ? `${count} file${count === 1 ? '' : 's'} selected` : 'No files selected';
  invalidateProfile();
});
form.addEventListener('input', invalidateProfile);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  prepareButton.disabled = true;
  invalidateProfile();
  try {
    const fonts = await selectedAssets();
    const totalBytes = fonts.reduce((sum, font) => sum + font.data.byteLength, 0);
    if (totalBytes > 25 * 1024 * 1024) {
      throw new Error('This selection exceeds 25 MB. Choose fewer styles to keep the profile reliable on mobile Safari.');
    }
    preparedProfile = buildProfile(fonts, {
      displayName: displayName.value.trim() || undefined,
      description: description.value.trim() || undefined,
      identifier: identifier.value.trim() || randomIdentifier(),
    });
    prepareButton.hidden = true;
    downloadButton.hidden = false;
    setStatus(`Profile ready with ${fonts.length} font${fonts.length === 1 ? '' : 's'} (${(totalBytes / 1024 / 1024).toFixed(1)} MB).`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Could not prepare the profile.', true);
  } finally {
    prepareButton.disabled = false;
  }
});

downloadButton.addEventListener('click', () => {
  if (preparedProfile) downloadProfile(preparedProfile);
});

form.addEventListener('reset', () => {
  window.setTimeout(() => {
    selectedFamily = null;
    fileInput.value = '';
    familySelection.hidden = true;
    familySelection.replaceChildren();
    fileName.textContent = 'No files selected';
    identifier.value = randomIdentifier();
    invalidateProfile();
    setStatus('');
  });
});

identifier.value = randomIdentifier();
loadCatalog().then((loaded) => {
  catalog = loaded;
  renderResults();
}).catch((error: unknown) => {
  catalogStatus.textContent = error instanceof Error ? error.message : 'Could not load the font catalog.';
  catalogStatus.classList.add('error');
});
