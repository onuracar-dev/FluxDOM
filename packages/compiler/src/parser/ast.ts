export interface FlowComponent {
  script: ScriptBlock | null;
  template: TemplateBlock | null;
  style: StyleBlock | null;
}
export interface ScriptBlock { content: string; lang?: string; }
export interface StyleBlock { content: string; scoped: boolean; }
export interface TemplateBlock { children: TemplateNode[]; }
export type TemplateNode = ElementNode | TextNode | ExpressionNode | IfBlockNode | EachBlockNode;
export interface ElementNode { type: 'Element'; tag: string; attributes: Record<string,string>; events: Record<string,string>; bindings: Record<string,string>; children: TemplateNode[]; }
export interface TextNode { type: 'Text'; content: string; }
export interface ExpressionNode { type: 'Expression'; content: string; }
export interface IfBlockNode { type: 'IfBlock'; condition: string; children: TemplateNode[]; }
export interface EachBlockNode { type: 'EachBlock'; expression: string; item: string; index?: string; children: TemplateNode[]; }
