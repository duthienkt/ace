/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 *
 * Copyright (c) 2010, Ajax.org B.V.
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of Ajax.org B.V. nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL AJAX.ORG B.V. BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * ***** END LICENSE BLOCK ***** */

define(function(require, exports, module) {
"use strict";

var oop = require("./lib/oop");
var dom = require("./lib/dom");
var event = require("./lib/event");
var EventEmitter = require("./lib/event_emitter").EventEmitter;
// on ie maximal element height is smaller than what we get from 4-5K line document
// so scrollbar doesn't work, as a workaround we do not set height higher than MAX_SCROLL_H
// and rescale scrolltop
var MAX_SCROLL_H = 0x8000;

/**
 * An abstract class representing a native scrollbar control.
 * @class ScrollBar
 **/

/**
 * Creates a new `ScrollBar`. `parent` is the owner of the scroll bar.
 * @param {DOMElement} parent A DOM element 
 *
 * @constructor
 **/
var ScrollBar = function(parent) {
    this.element = dom.createElement("div");
    this.element.className = "ace_scrollbar ace_scrollbar" + this.classSuffix;

    this.inner = dom.createElement("div");
    this.inner.className = "ace_scrollbar-inner";
    this.element.appendChild(this.inner);
    parent.appendChild(this.element);
    
    /*element not use for display*/
    
    /**
     * use a box instead 
    */
    
    this.box = dom.createElement("div");
    this.box.className = "ace_scrollbar-box ace_scrollbar-box" + this.classSuffix;
    parent.appendChild(this.box);
    this.container = dom.createElement('div');
    this.container.className = 'ace_scrollbar-box-container';
    this.box.appendChild(this.container);
    this.button = dom.createElement('div');
    this.button.className = 'ace_scrollbar-button';
    this.container.appendChild(this.button);
    

    this.setVisible(false);

    // event.addListener(this.element, "scroll", this.onScroll.bind(this));
    event.addListener(this.box, "mousedown", event.preventDefault);
    
     /* Private event handler */
    var _this = this;
    var mouseFinishEventHandler = function(event){
        document.body.removeEventListener('mousemove', mouseMoveEventHandler);
        document.body.removeEventListener('mouseup', mouseFinishEventHandler);
        document.body.removeEventListener('mouseleave', mouseFinishEventHandler);
        _this.onMoveEnd && _this.onMoveEnd(event);
            
    };
    
    var mouseMoveEventHandler = function(event){
         _this.onMoving && _this.onMoving(event);
    }; 
    
    var mouseDownButtonEventHandler = function(event){
        event.pressButton = true;
        _this.isMoving = false;
        document.body.addEventListener('mousemove', mouseMoveEventHandler);
        document.body.addEventListener('mouseup', mouseFinishEventHandler);
        document.body.addEventListener('mouseleave', mouseFinishEventHandler);
        _this.onMoveBegin && _this.onMoveBegin(event);
    };
    
    this.button.addEventListener('mousedown', mouseDownButtonEventHandler);
  
    
    
    var mouseDownBoxEventHandler = function(event){
        if (event.pressButton) return;
        _this.onPressScroll && _this.onPressScroll(event);
        window.requestAnimationFrame(function(){
            mouseDownButtonEventHandler(event);
            
        });
    };
    this.box.addEventListener('mousedown', mouseDownBoxEventHandler);
    
    
};

(function() {
    oop.implement(this, EventEmitter);

    this.setVisible = function(isVisible) {
        this.element.style.display = isVisible ? "" : "none";
        /* use box to display*/
        this.box.style.visibility = isVisible ? "" : "hidden";
        
        this.isVisible = isVisible;
        
        //copy style from element to box
       
  
    };
}).call(ScrollBar.prototype);

/**
 * Represents a vertical scroll bar.
 * @class VScrollBar
 **/

/**
 * Creates a new `VScrollBar`. `parent` is the owner of the scroll bar.
 * @param {DOMElement} parent A DOM element
 * @param {Object} renderer An editor renderer
 *
 * @constructor
 **/
var VScrollBar = function(parent, renderer) {
    ScrollBar.call(this, parent);
    this.scrollTop = 0;
    this.scrollHeight = 0;

    // in OSX lion the scrollbars appear to have no width. In this case resize the
    // element to show the scrollbar but still pretend that the scrollbar has a width
    // of 0px
    // in Firefox 6+ scrollbar is hidden if element has the same width as scrollbar
    // make element a little bit wider to retain scrollbar when page is zoomed 
    renderer.$scrollbarWidth = 
    this.width = dom.scrollbarWidth(parent.ownerDocument) || 7;
    this.inner.style.width =
    this.element.style.width = this.width  + "px";
    /*box width*/
    this.box.style.width = this.width + "px";
    this.$minWidth = 0;
};

oop.inherits(VScrollBar, ScrollBar);

(function() {

    this.classSuffix = '-v';
    
    
    this.onMoveBegin = function(event){
        this.pressY = event.clientY;
        this.pressScrollTop = this.scrollTop;
    };
    
    this.onMoving = function(event){
        var dy = (event.clientY - this.pressY)* this.scrollHeight/ this.box.clientHeight;
        this.setScrollTop(this.pressScrollTop+dy);
        this._emit("scroll", {data: this.scrollTop});
    };
    
    this.onMoveEnd = function(event){
        
    };
    
    
    this.onPressScroll = function(event){
        var boxBound = this.box.getBoundingClientRect();
        var scrollTop = (event.clientY - boxBound.top - this.button.clientHeight / 2)* this.scrollHeight/ this.box.clientHeight;
        this.setScrollTop(scrollTop);
        this._emit("scroll", {data: this.scrollTop});
    };
    
    
    this.onResize = function(){
        var boxBound = this.box.getBoundingClientRect();
        this.button.style.height = boxBound.height/Math.max(this.scrollHeight,boxBound.height) *100 + '%';
        this.button.style.top = this.scrollTop/Math.max( this.scrollHeight,boxBound.height) *100 + '%';
    };

    /**
     * Returns the width of the scroll bar.
     * @returns {Number}
     **/
    this.getWidth = function() {
        return Math.max(this.isVisible ? this.width : 0, this.$minWidth || 0);
    };

    /**
     * Sets the height of the scroll bar, in pixels.
     * @param {Number} height The new height
     **/
    this.setHeight = function(height) {
        this.element.style.height = height + "px";
        this.box.style.height = height + "px";
    };

    /**
     * Sets the inner height of the scroll bar, in pixels.
     * @param {Number} height The new inner height
     * @deprecated Use setScrollHeight instead
     **/
    this.setInnerHeight = 
    /**
     * Sets the scroll height of the scroll bar, in pixels.
     * @param {Number} height The new scroll height
     **/
    this.setScrollHeight = function(height) {
        //todo set inner height
        this.scrollHeight = height;
        window.requestAnimationFrame(function(){
            var boxBound = this.box.getBoundingClientRect();
            this.button.style.height = boxBound.height/Math.max(height,boxBound.height) *100 + '%';
            this.button.style.top = this.scrollTop/Math.max( this.scrollHeight,boxBound.height) *100 + '%';
        }.bind(this));
       
       
        this.inner.style.height = height + "px";
    };

    /**
     * Sets the scroll top of the scroll bar.
     * @param {Number} scrollTop The new scroll top
     **/
    this.setScrollTop = function(scrollTop) {
        // on chrome 17+ for small zoom levels after calling this function
        // this.element.scrollTop != scrollTop which makes page to scroll up.
        if (scrollTop < 0) scrollTop = 0;
        if (scrollTop + this.box.clientHeight > this.scrollHeight + 15) scrollTop = this.scrollHeight - this.box.clientHeight + 15;
        if (this.scrollTop != scrollTop) {
            this.scrollTop = scrollTop;
            this.element.scrollTop = scrollTop;
            window.requestAnimationFrame(function(){
                this.button.style.top = this.scrollTop/Math.max( this.scrollHeight,this.box.clientHeight) *100 + '%';
            }.bind(this));
        }
    };

}).call(VScrollBar.prototype);

/**
 * Represents a horisontal scroll bar.
 * @class HScrollBar
 **/

/**
 * Creates a new `HScrollBar`. `parent` is the owner of the scroll bar.
 * @param {DOMElement} parent A DOM element
 * @param {Object} renderer An editor renderer
 *
 * @constructor
 **/
var HScrollBar = function(parent, renderer) {
    ScrollBar.call(this, parent);
    this.scrollLeft = 0;

    // in OSX lion the scrollbars appear to have no width. In this case resize the
    // element to show the scrollbar but still pretend that the scrollbar has a width
    // of 0px
    // in Firefox 6+ scrollbar is hidden if element has the same width as scrollbar
    // make element a little bit wider to retain scrollbar when page is zoomed 
    this.height = renderer.$scrollbarWidth ||5;
    this.inner.style.height =
    this.element.style.height = this.height  + "px";
    this.box.style.height = this.height  + "px";
};

oop.inherits(HScrollBar, ScrollBar);

(function() {

    this.classSuffix = '-h';



    this.onMoveBegin = function(event){
        this.pressX = event.clientX;
        this.pressScrollLeft = this.scrollLeft;
    };
    
    this.onMoving = function(event){
        var dx = (event.clientX - this.pressX)* this.scrollWidth/ this.box.clientWidth;
        this.setScrollLeft(this.pressScrollLeft+dx);
        this._emit("scroll", {data: this.scrollLeft});
    };
    
    this.onMoveEnd = function(event){
        
    };
    
    
    this.onPressScroll = function(event){
        var boxBound = this.box.getBoundingClientRect();
        var scrollLeft = (event.clientX - boxBound.left - this.button.clientWidth / 2)* this.scrollWidth/ this.box.clientWidth;
        this.setScrollLeft(scrollLeft);
        this._emit("scroll", {data: this.scrollLeft});
    };
    
    
    this.onResize = function(){
        var boxBound = this.box.getBoundingClientRect();
        this.button.style.width = boxBound.width/Math.max(this.scrollWidth,boxBound.width) *100 + '%';
        this.button.style.left = this.scrollTop/Math.max( this.scrollWidth,boxBound.width) *100 + '%';
    };
   
    /**
     * Returns the height of the scroll bar.
     * @returns {Number}
     **/
    this.getHeight = function() {
        return this.isVisible ? this.height : 0;
    };

    /**
     * Sets the width of the scroll bar, in pixels.
     * @param {Number} width The new width
     **/
    this.setWidth = function(width) {
        this.element.style.width = width + "px";
        this.box.style.width = width + "px";
    };

    /**
     * Sets the inner width of the scroll bar, in pixels.
     * @param {Number} width The new inner width
     * @deprecated Use setScrollWidth instead
     **/
    /**
     * Sets the scroll width of the scroll bar, in pixels.
     * @param {Number} width The new scroll width
     **/
    this.setInnerWidth =
    this.setScrollWidth = function(width) {
        this.scrollWidth = width;
        window.requestAnimationFrame(function(){
            var boxBound = this.box.getBoundingClientRect();
            this.button.style.width = boxBound.width/Math.max(width,boxBound.width) *100 + '%';
            this.button.style.left = this.scrollTop/Math.max( this.scrollWidth,boxBound.width) *100 + '%';
        }.bind(this));
        this.inner.style.width = width + "px";
    };

    /**
     * Sets the scroll left of the scroll bar.
     * @param {Number} scrollTop The new scroll left
     **/
    this.setScrollLeft = function(scrollLeft) {
        if (scrollLeft < 0) scrollLeft = 0;
        if (scrollLeft + this.box.clientWidth > this.scrollWidth) scrollLeft = this.scrollWidth - this.box.clientWidth;
        if (this.scrollLeft != scrollLeft) {
            this.scrollLeft = scrollLeft;
            window.requestAnimationFrame(function(){
                this.element.scrollLeft = scrollLeft;
                var boxBound = this.box.getBoundingClientRect();
                this.button.style.left = this.scrollLeft/Math.max( this.scrollWidth,this.box.clientWidth) *100 + '%';
            }.bind(this));
        }
    };

}).call(HScrollBar.prototype);


exports.ScrollBar = VScrollBar; // backward compatibility
exports.ScrollBarV = VScrollBar; // backward compatibility
exports.ScrollBarH = HScrollBar; // backward compatibility

exports.VScrollBar = VScrollBar;
exports.HScrollBar = HScrollBar;
});
