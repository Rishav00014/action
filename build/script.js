const url = "http://localhost:3000"


document.getElementById('export-json').addEventListener('click', () => exportDocument('json'));
document.getElementById('export-csv').addEventListener('click', () => exportDocument('csv'));


function exportDocument(format) {
  window.location.href = `/documents/export/${format}`;
}

let rootDocument
let selectedDocId

async function getDocuments() {
  const response = await fetch(`/documents`);
  const doc = await response.json();
  return doc;
}

// Function to fetch document by ID from server
async function getDocument(id) {
  const response = await fetch(`/documents/${id}`);
  const doc = await response.json();
  return doc;
}

// Function to save document changes to the server
async function saveDocument(doc) {
  await fetch(`/documents/${doc.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(doc),
  });
}

// Recursive function to render a document and its children
async function renderDocument(doc, parentElement) {
  const docElement = document.createElement('div');
  docElement.classList.add('doc');
  docElement.dataset.id = doc._id;
  docElement.dataset.childrenFetched = 'false';

  // Create the expand/collapse button
  const expandCollapseButton = document.createElement('button');
  expandCollapseButton.classList.add('expand-collapse-button');
  expandCollapseButton.textContent = document.children.length ? '►' : ''
  docElement.appendChild(expandCollapseButton)

  const titleElement = document.createElement('div');
  titleElement.classList.add('doc-title');
  titleElement.textContent = doc.title;
  docElement.appendChild(titleElement);



  const addButton = document.createElement('button');
  addButton.classList.add('add-node-button');
  addButton.textContent = '+';
  docElement.appendChild(addButton);

  const childrenContainer = document.createElement('div');
  childrenContainer.classList.add('doc-children');
  docElement.appendChild(childrenContainer);


  parentElement.appendChild(docElement);



}

// Function to create nodes
async function createNode(newNodeTitle, parentId) {
  const newNode = {
    title: newNodeTitle,
    parentId: parentId,
  };
  console.log(newNode);

  const res = await fetch('/documents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newNode),
  });

  const createdNode = await res.json();
  return createdNode

}

// Fucntion to create bullet Points 
async function bulletPoints(docId) {
  // Fetch the document from the server
  const response = await fetch(`/documents/${docId}/children`);
  const children = await response.json();


  // Get the main content area
  const main = document.getElementById('doc-content');
  main.dataset.id = docId
  main.innerHTML = '';  // Clear the main content area

  // Create and append a div for each child document
  for (let child of children) {
    const childDiv = document.createElement('div');
    childDiv.contentEditable = true;
    childDiv.draggable = true;
    childDiv.dataset.id = child._id;
    childDiv.classList.add('bullet-point');
    childDiv.textContent = child.title;
    setupDragAndDrop(childDiv, child)

    main.appendChild(childDiv);
  }
}



// Fetch and render the root document when the page loads
fetch('/documents/root')
  .then(response => response.json())
  .then(async (doc) => {
    console.log(doc);
    renderDocument(doc, document.getElementById("sidebar"))
  });


// When a document title is clicked, fetch the document and display its content in the main area
document.getElementById('sidebar').addEventListener('click', async (event) => {
  if (event.target.classList.contains('doc-title')) {
    // Get the document ID
    const docId = event.target.parentNode.dataset.id;
    selectedDocId = docId
    bulletPoints(docId)
    // // Display the document content in the main area
    // document.getElementById('doc-content').innerHTML = `<div class="bullet-point" contenteditable="true">${doc.content}<br></div>`
  }
});

function setupDragAndDrop(bulletPointElement, child) {
  bulletPointElement.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', child._id);
  });

  bulletPointElement.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  bulletPointElement.addEventListener('drop', async (e) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    const droppedId = child._id;

    const response = await fetch(`/documents/swap/${draggedId}/${droppedId}`, {
      method: 'POST',
    });

    if (!response.ok) {
      const message = await response.text();
      console.error(message);
      return;
    }

    const updatedDocument = await response.json();
    renderDocument(updatedDocument);
  });
}



// Get the textarea and save button elements
const textarea = document.getElementById('doc-content');
const saveButton = document.getElementById('save-button');

let saveTimeoutId;
// Function to save the changes to the server


async function saveChanges(documentId, updatedText) {
  // Update the document on the server
  const response = await fetch(`/documents/${documentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: updatedText,
    }),
  });
  const updatedDocument = await response.json();

  // Update the title of the document in the sidebar
  const sidebarDocTitle = document.querySelector(`.doc[data-id="${documentId}"]`);

  let title = sidebarDocTitle.querySelector(".doc-title")
  title.innerText = updatedText
}

// Listen for the input event on the textarea
textarea.addEventListener('input', (e) => {
  console.log(e.target.dataset.id, e.target.innerText);
  // Save the changes after a delay to avoid saving too frequently
  // If a timer is already running, clear it
  if (saveTimeoutId) clearTimeout(saveTimeoutId);

  // Start a new timer
  saveTimeoutId = setTimeout(() => {
    // Call the update function
    saveChanges(e.target.dataset.id, e.target.innerText);
    // Clear the timeoutId
    timeoutId = null;
  }, 2000);; // Adjust the delay as needed
});


// When an "Add Node" button is clicked, create a new document
sidebar.addEventListener('click', async function (event) {
  if (event.target.matches('.add-node-button')) {
    const parentElement = event.target.parentElement;
    const parentId = parentElement.dataset.id;

    const newNodeTitle = prompt('Enter new node title');
    if (newNodeTitle === null || newNodeTitle.trim() === '') return;

    let createdNode = await createNode(newNodeTitle, parentId)
    renderDocument(createdNode, parentElement.querySelector('.doc-children'));
  }
});


// When an expand/collapse button is clicked, fetch the children of its document and toggle their visibility
sidebar.addEventListener('click', async function (event) {
  if (event.target.classList.contains('expand-collapse-button')) {
    const parentNode = event.target.parentNode;
    const parentNodeId = parentNode.dataset.id;
    // Fetch the children from the server if they haven't been fetched yet
    const childrenContainer = parentNode.querySelector('.doc-children');

    if (event.target.parentElement.getAttribute('data-children-fetched') === 'true') {

      if (childrenContainer.style.display === 'none') {
        childrenContainer.style.display = 'block';
        event.target.textContent = '▼';
      } else {
        childrenContainer.style.display = 'none';
        event.target.textContent = '►';
      }
    } else {
      const response = await fetch(`/documents/${parentNodeId}/children`);
      const children = await response.json();

      for (let child of children) {
        renderDocument(child, childrenContainer);
      }
      event.target.parentElement.setAttribute('data-children-fetched', 'true');
      event.target.textContent = '▼';
    }
  }
});





const dropdown = document.createElement('div');

dropdown.style.display = 'none';
dropdown.style.position = 'absolute';
dropdown.style.zIndex = '10';
dropdown.style.background = '#fff';
dropdown.style.border = '1px solid #ccc';
dropdown.style.padding = '10px';
dropdown.style.width = '200px';

dropdown.innerHTML = `
  <div>Media</div>
  <div>Animation</div>
  <div>Bullet list</div>
  <!-- Add as many options as you need -->
`;

document.body.appendChild(dropdown);

textarea.addEventListener('keyup', function (event) {
  const text = textarea.textContent;
  const slashIndex = text.lastIndexOf('/');

  if (event.key === '/') {

    // Get cursor position
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const rect = range.getClientRects()[0];

    if (rect) {
      dropdown.style.left = `${rect.left}px`;
      dropdown.style.top = `${rect.bottom + 10}px`;
      dropdown.style.display = 'block';
    }

  } else if (dropdown.style.display === 'block' && event.key === 'Escape') {
    dropdown.style.display = 'none';
  }
});

dropdown.addEventListener('click', function (event) {
  if (event.target !== dropdown) {
    document.execCommand('insertHTML', false, event.target.textContent);
    dropdown.style.display = 'none';
  }
});


// Initialize with one bullet point
document.getElementById('doc-content').innerHTML = '<div class="bullet-point" contenteditable="true"><br></div>';

// Handle enter and tab events for bullet points.
document.getElementById('doc-content').addEventListener('keydown', async function (e) {
  if (e.key === 'Enter') {
    e.preventDefault();

    // Insert a new bullet point after the current line.
    let bulletPoint = document.createElement('div');
    bulletPoint.classList.add('bullet-point');
    bulletPoint.contentEditable = "true";
    bulletPoint.innerHTML = '<br>';

    if (e.target.nextSibling) {
      e.target.parentNode.insertBefore(bulletPoint, e.target.nextSibling);
    } else {
      e.target.parentNode.appendChild(bulletPoint);
    }

    let node = await createNode("untitled", e.target.parentElement.dataset.id)
    // Update the title of the document in the sidebar
    const sidebarDoc = document.querySelector(`.doc[data-id="${node.parentId}"]`)
    const childrenContainer = sidebarDoc.parentNode.querySelector('.doc-children');

    renderDocument(node, childrenContainer)



    // Focus on the new bullet point
    bulletPoint.focus();
  } else if (e.key === 'Tab') {
    e.preventDefault();

    // Indent the current line to create a nested bullet point.
    e.target.style.marginLeft = (parseInt(e.target.style.marginLeft || '0') + 20) + 'px';
  }
});

// Handle click events for bullet points.
document.getElementById('doc-content').addEventListener('click', function (e) {
  if (e.target.classList.contains('bullet-point')) {
    // Select the clicked bullet point.
    let range = document.createRange();
    range.selectNodeContents(e.target);
    let selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }
});