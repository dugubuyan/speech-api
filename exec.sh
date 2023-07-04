for i in public/uploads/*.wav
  do echo $i
  ./speech2txt -l auto -olrc "${i}"
  done