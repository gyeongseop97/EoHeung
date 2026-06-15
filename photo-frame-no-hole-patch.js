(function(){
  if(window.__eoNoHoleFramePatch)return;
  window.__eoNoHoleFramePatch=true;
  const original=CanvasRenderingContext2D.prototype.clearRect;
  CanvasRenderingContext2D.prototype.clearRect=function(x,y,w,h){
    try{
      const canvas=this.canvas;
      const isPhotoFramePunch=canvas&&!canvas.id&&canvas.width>=900&&canvas.height>=900&&x>0&&y>0&&w>200&&h>200;
      if(isPhotoFramePunch)return;
    }catch(e){}
    return original.apply(this,arguments);
  };
})();
