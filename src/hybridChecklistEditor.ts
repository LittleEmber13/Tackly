export const taskLineRegex = /^(\s*(?:[-*+]|\d+[.)])\s+\[)([ xX])(\].*)$/

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function lineToDivHtml(line: string): string {
  const match = line.match(taskLineRegex)
  if (match) {
    const checked = match[2] !== ' '
    const text = match[3].replace(/^\]\s?/, '')
    return `<div class="editor-line task-line"><input type="checkbox" class="task-checkbox" contenteditable="false"${checked ? ' checked' : ''} />${escapeHtml(text) || '<br>'}</div>`
  }
  return `<div class="editor-line">${escapeHtml(line) || '<br>'}</div>`
}

export function contentToEditorHtml(content: string): string {
  const lines = content.length ? content.split('\n') : ['']
  return lines.map(lineToDivHtml).join('')
}

export function serializeEditor(root: HTMLElement): string {
  const lines: string[] = []
  let prevWasTask: boolean | null = null
  root.querySelectorAll(':scope > div.editor-line').forEach((el) => {
    const lineEl = el as HTMLElement
    const checkbox = lineEl.querySelector(':scope > input.task-checkbox') as HTMLInputElement | null
    const isTask = !!checkbox

    if (prevWasTask !== null && prevWasTask !== isTask && lines[lines.length - 1] !== '') {
      lines.push('')
    }

    if (checkbox) {
      lines.push(`- [${checkbox.checked ? 'x' : ' '}] ${lineEl.textContent ?? ''}`)
    } else {
      lines.push(lineEl.textContent ?? '')
    }
    prevWasTask = isTask
  })
  return lines.join('\n')
}

function getLineElement(node: Node | null, root: HTMLElement): HTMLElement | null {
  let el: Node | null = node
  while (el && el !== root) {
    if (el.parentNode === root && el instanceof HTMLElement && el.classList.contains('editor-line')) {
      return el
    }
    el = el.parentNode
  }
  return null
}

function ensureLineHasCaretTarget(lineEl: HTMLElement): void {
  const hasText = (lineEl.textContent ?? '').length > 0
  if (!hasText && !lineEl.querySelector(':scope > br')) {
    lineEl.appendChild(document.createElement('br'))
  }
}

function placeCaretAfter(node: Node): void {
  const sel = window.getSelection()
  if (!sel) return
  const r = document.createRange()
  r.setStartAfter(node)
  r.collapse(true)
  sel.removeAllRanges()
  sel.addRange(r)
}

function placeCaretAtStart(el: HTMLElement): void {
  const sel = window.getSelection()
  if (!sel) return
  const r = document.createRange()
  r.selectNodeContents(el)
  const checkbox = el.querySelector(':scope > input.task-checkbox')
  if (checkbox) r.setStartAfter(checkbox)
  r.collapse(true)
  sel.removeAllRanges()
  sel.addRange(r)
}

function placeCaretAtOffset(el: HTMLElement, offset: number): void {
  const sel = window.getSelection()
  if (!sel) return
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  let remaining = offset
  while (node) {
    const len = node.textContent?.length ?? 0
    if (remaining <= len) {
      const r = document.createRange()
      r.setStart(node, remaining)
      r.collapse(true)
      sel.removeAllRanges()
      sel.addRange(r)
      return
    }
    remaining -= len
    node = walker.nextNode()
  }
  placeCaretAtStart(el)
}

function getCaretOffsetFromEnd(lineEl: HTMLElement, range: Range): number {
  const total = (lineEl.textContent ?? '').length
  const testRange = document.createRange()
  testRange.selectNodeContents(lineEl)
  testRange.setEnd(range.startContainer, range.startOffset)
  return total - testRange.toString().length
}

function isCaretAtTextStart(lineEl: HTMLElement, range: Range): boolean {
  const testRange = document.createRange()
  testRange.selectNodeContents(lineEl)
  const checkbox = lineEl.querySelector(':scope > input.task-checkbox')
  if (checkbox) testRange.setStartAfter(checkbox)
  testRange.setEnd(range.startContainer, range.startOffset)
  return testRange.toString().length === 0
}

function createCheckbox(checked?: boolean): HTMLInputElement {
  const checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.className = 'task-checkbox'
  checkbox.setAttribute('contenteditable', 'false')
  if (checked) checkbox.checked = true
  return checkbox
}

export function autoConvertTaskLines(root: HTMLElement): void {
  const sel = window.getSelection()
  const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null
  const anchorLine = range ? getLineElement(range.startContainer, root) : null
  const anchorOffsetFromEnd = anchorLine && range ? getCaretOffsetFromEnd(anchorLine, range) : null

  root.querySelectorAll(':scope > div.editor-line:not(.task-line)').forEach((el) => {
    const lineEl = el as HTMLElement
    const text = lineEl.textContent ?? ''
    const match = text.match(/^-\s\[([ xX])\]\s(.*)$/)
    if (!match) return

    const wasAnchor = lineEl === anchorLine
    const checked = match[1] !== ' '
    const rest = match[2]

    lineEl.classList.add('task-line')
    lineEl.innerHTML = ''
    lineEl.appendChild(createCheckbox(checked))
    if (rest) lineEl.appendChild(document.createTextNode(rest))
    ensureLineHasCaretTarget(lineEl)

    if (wasAnchor) {
      const offset = Math.max(0, rest.length - (anchorOffsetFromEnd ?? 0))
      placeCaretAtOffset(lineEl, offset)
    }
  })
}

export function handleEnter(root: HTMLElement): void {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return
  const range = sel.getRangeAt(0)
  const lineEl = getLineElement(range.startContainer, root)
  if (!lineEl) return
  const isTask = lineEl.classList.contains('task-line')

  if (isTask && (lineEl.textContent ?? '') === '') {
    const checkbox = lineEl.querySelector(':scope > input.task-checkbox')
    checkbox?.remove()
    lineEl.classList.remove('task-line')
    ensureLineHasCaretTarget(lineEl)
    placeCaretAtStart(lineEl)
    return
  }

  const endRange = document.createRange()
  endRange.selectNodeContents(lineEl)
  endRange.setStart(range.startContainer, range.startOffset)
  const remainder = endRange.extractContents()
  ensureLineHasCaretTarget(lineEl)

  const newLine = document.createElement('div')
  newLine.className = isTask ? 'editor-line task-line' : 'editor-line'
  let checkbox: HTMLInputElement | null = null
  if (isTask) {
    checkbox = createCheckbox()
    newLine.appendChild(checkbox)
  }
  newLine.appendChild(remainder)
  ensureLineHasCaretTarget(newLine)
  lineEl.after(newLine)

  if (checkbox) placeCaretAfter(checkbox)
  else placeCaretAtStart(newLine)
}

export function handleBackspace(root: HTMLElement): boolean {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return false
  const range = sel.getRangeAt(0)
  const lineEl = getLineElement(range.startContainer, root)
  if (!lineEl) return false
  if (!isCaretAtTextStart(lineEl, range)) return false

  if (lineEl.classList.contains('task-line')) {
    const checkbox = lineEl.querySelector(':scope > input.task-checkbox')
    checkbox?.remove()
    lineEl.classList.remove('task-line')
    ensureLineHasCaretTarget(lineEl)
    placeCaretAtStart(lineEl)
    return true
  }

  const prevLine = lineEl.previousElementSibling as HTMLElement | null
  if (!prevLine || !prevLine.classList.contains('editor-line')) return false

  const prevBr = prevLine.querySelector(':scope > br')
  prevBr?.remove()
  const mergeOffset = (prevLine.textContent ?? '').length

  while (lineEl.firstChild) {
    const child = lineEl.firstChild
    if (child.nodeName === 'BR') {
      lineEl.removeChild(child)
      continue
    }
    prevLine.appendChild(child)
  }
  lineEl.remove()
  placeCaretAtOffset(prevLine, mergeOffset)
  return true
}

export function insertTaskLine(root: HTMLElement): void {
  const sel = window.getSelection()
  const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null
  const refLine = range && root.contains(range.startContainer) ? getLineElement(range.startContainer, root) : null

  const newLine = document.createElement('div')
  newLine.className = 'editor-line task-line'
  const checkbox = createCheckbox()
  newLine.appendChild(checkbox)
  newLine.appendChild(document.createElement('br'))

  if (refLine) refLine.after(newLine)
  else root.appendChild(newLine)

  root.focus()
  placeCaretAfter(checkbox)
}
